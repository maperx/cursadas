"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { asignaturas, asignaturaDocentes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const asignaturaSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  carreraId: z.string().uuid("Carrera inválida"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  visible: z.boolean().default(true),
  docenteIds: z.array(z.string()).optional(),
});

export async function getAsignaturas() {
  return await db.query.asignaturas.findMany({
    with: {
      carrera: true,
      asignaturaDocentes: {
        with: {
          user: true,
        },
      },
    },
    orderBy: (asignaturas, { asc }) => [asc(asignaturas.name)],
  });
}

export async function getAsignatura(id: string) {
  return await db.query.asignaturas.findFirst({
    where: eq(asignaturas.id, id),
    with: {
      carrera: true,
      asignaturaDocentes: {
        with: {
          user: true,
        },
      },
    },
  });
}

export async function getAsignaturasByCarrera(carreraId: string) {
  return await db.query.asignaturas.findMany({
    where: eq(asignaturas.carreraId, carreraId),
    orderBy: (asignaturas, { asc }) => [asc(asignaturas.name)],
  });
}

export async function createAsignatura(formData: FormData) {
  const docenteIdsRaw = formData.get("docenteIds") as string;
  const data = {
    name: formData.get("name") as string,
    carreraId: formData.get("carreraId") as string,
    startDate: formData.get("startDate") as string || null,
    endDate: formData.get("endDate") as string || null,
    visible: formData.get("visible") === "true",
    docenteIds: docenteIdsRaw ? JSON.parse(docenteIdsRaw) : [],
  };

  const validated = asignaturaSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const [newAsignatura] = await db.insert(asignaturas).values({
    name: validated.data.name,
    carreraId: validated.data.carreraId,
    startDate: validated.data.startDate,
    endDate: validated.data.endDate,
    visible: validated.data.visible,
  }).returning();

  // Add docentes if any
  if (validated.data.docenteIds && validated.data.docenteIds.length > 0) {
    await db.insert(asignaturaDocentes).values(
      validated.data.docenteIds.map((userId) => ({
        asignaturaId: newAsignatura.id,
        userId,
      }))
    );
  }

  revalidatePath("/admin/asignaturas");
  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true };
}

export async function updateAsignatura(id: string, formData: FormData) {
  const docenteIdsRaw = formData.get("docenteIds") as string;
  const data = {
    name: formData.get("name") as string,
    carreraId: formData.get("carreraId") as string,
    startDate: formData.get("startDate") as string || null,
    endDate: formData.get("endDate") as string || null,
    visible: formData.get("visible") === "true",
    docenteIds: docenteIdsRaw ? JSON.parse(docenteIdsRaw) : [],
  };

  const validated = asignaturaSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db
    .update(asignaturas)
    .set({
      name: validated.data.name,
      carreraId: validated.data.carreraId,
      startDate: validated.data.startDate,
      endDate: validated.data.endDate,
      visible: validated.data.visible,
      updatedAt: new Date(),
    })
    .where(eq(asignaturas.id, id));

  // Update docentes - delete all and re-add
  await db.delete(asignaturaDocentes).where(eq(asignaturaDocentes.asignaturaId, id));

  if (validated.data.docenteIds && validated.data.docenteIds.length > 0) {
    await db.insert(asignaturaDocentes).values(
      validated.data.docenteIds.map((userId) => ({
        asignaturaId: id,
        userId,
      }))
    );
  }

  revalidatePath("/admin/asignaturas");
  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAsignatura(id: string) {
  await db.delete(asignaturas).where(eq(asignaturas.id, id));
  revalidatePath("/admin/asignaturas");
  revalidatePath("/admin/cursadas");
  return { success: true };
}
