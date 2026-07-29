"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  aulas,
  carreraSedes,
  regimenSolicitudes,
  sedes,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-server";

const sedeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  address: z.string().optional().nullable(),
  visible: z.boolean().default(true),
  carreraIds: z.array(z.string().uuid()).default([]),
});

function parseSedeForm(formData: FormData) {
  const carreraIdsRaw = formData.get("carreraIds") as string | null;
  return {
    name: (formData.get("name") as string)?.trim(),
    address: (formData.get("address") as string)?.trim() || null,
    visible: formData.get("visible") === "true",
    carreraIds: carreraIdsRaw ? JSON.parse(carreraIdsRaw) : [],
  };
}

function revalidateSedes() {
  revalidatePath("/admin/sedes");
  revalidatePath("/admin/carreras");
  revalidatePath("/admin/aulas");
  revalidatePath("/admin/cursadas");
  revalidatePath("/regimen-especial");
  revalidatePath("/");
}

export async function getSedes() {
  return await db.query.sedes.findMany({
    orderBy: (sedes, { asc }) => [asc(sedes.name)],
  });
}

/** Sedes con las carreras que se dictan en cada una. */
export async function getSedesConCarreras() {
  const rows = await db.query.sedes.findMany({
    with: {
      carreraSedes: { with: { carrera: true } },
    },
    orderBy: (sedes, { asc }) => [asc(sedes.name)],
  });

  return rows.map((sede) => ({
    id: sede.id,
    name: sede.name,
    address: sede.address,
    visible: sede.visible,
    createdAt: sede.createdAt,
    updatedAt: sede.updatedAt,
    carreras: sede.carreraSedes
      .map((cs) => ({
        id: cs.carrera.id,
        name: cs.carrera.name,
        color: cs.carrera.color,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export async function getSede(id: string) {
  return await db.query.sedes.findFirst({
    where: eq(sedes.id, id),
  });
}

export async function createSede(formData: FormData) {
  await requirePermission("sedes", "edit");

  const validated = sedeSchema.safeParse(parseSedeForm(formData));
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db.transaction(async (tx) => {
    const [sede] = await tx
      .insert(sedes)
      .values({
        name: validated.data.name,
        address: validated.data.address,
        visible: validated.data.visible,
      })
      .returning();

    if (validated.data.carreraIds.length > 0) {
      await tx.insert(carreraSedes).values(
        validated.data.carreraIds.map((carreraId) => ({
          carreraId,
          sedeId: sede.id,
        }))
      );
    }
  });

  revalidateSedes();
  return { success: true };
}

export async function updateSede(id: string, formData: FormData) {
  await requirePermission("sedes", "edit");

  const validated = sedeSchema.safeParse(parseSedeForm(formData));
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(sedes)
      .set({
        name: validated.data.name,
        address: validated.data.address,
        visible: validated.data.visible,
        updatedAt: new Date(),
      })
      .where(eq(sedes.id, id));

    await tx.delete(carreraSedes).where(eq(carreraSedes.sedeId, id));
    if (validated.data.carreraIds.length > 0) {
      await tx.insert(carreraSedes).values(
        validated.data.carreraIds.map((carreraId) => ({
          carreraId,
          sedeId: id,
        }))
      );
    }
  });

  revalidateSedes();
  return { success: true };
}

export async function deleteSede(id: string) {
  await requirePermission("sedes", "delete");

  // Las aulas referencian la sede con onDelete: restrict, así que se avisa
  // antes de intentar borrarla.
  const aulasEnSede = await db.query.aulas.findMany({
    where: eq(aulas.sedeId, id),
    columns: { id: true },
  });
  if (aulasEnSede.length > 0) {
    return {
      error: `No se puede eliminar la sede porque tiene ${aulasEnSede.length} aula(s) asignada(s).`,
    };
  }

  const solicitudes = await db.query.regimenSolicitudes.findMany({
    where: eq(regimenSolicitudes.sedeId, id),
    columns: { id: true },
  });
  if (solicitudes.length > 0) {
    return {
      error: `No se puede eliminar la sede porque tiene ${solicitudes.length} solicitud(es) de régimen especial asociada(s).`,
    };
  }

  await db.delete(sedes).where(eq(sedes.id, id));
  revalidateSedes();
  return { success: true };
}
