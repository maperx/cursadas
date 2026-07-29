"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { carreras, carreraSedes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const carreraSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido"),
  visible: z.boolean().default(true),
  // Una carrera puede dictarse en varias sedes.
  sedeIds: z.array(z.string().uuid()).min(1, "Seleccioná al menos una sede"),
});

function parseCarreraForm(formData: FormData) {
  const sedeIdsRaw = formData.get("sedeIds") as string | null;
  return {
    name: formData.get("name") as string,
    color: formData.get("color") as string,
    visible: formData.get("visible") === "true",
    sedeIds: sedeIdsRaw ? JSON.parse(sedeIdsRaw) : [],
  };
}

function revalidateCarreras() {
  revalidatePath("/admin/carreras");
  revalidatePath("/admin/asignaturas");
  revalidatePath("/admin/cursadas");
  revalidatePath("/admin/sedes");
  revalidatePath("/");
}

export async function getCarreras() {
  const rows = await db.query.carreras.findMany({
    with: {
      carreraSedes: { with: { sede: true } },
    },
    orderBy: (carreras, { asc }) => [asc(carreras.name)],
  });

  return rows.map(({ carreraSedes, ...carrera }) => ({
    ...carrera,
    sedeIds: carreraSedes.map((cs) => cs.sedeId),
    sedes: carreraSedes
      .map((cs) => ({ id: cs.sede.id, name: cs.sede.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export async function getCarrera(id: string) {
  return await db.query.carreras.findFirst({
    where: eq(carreras.id, id),
    with: {
      carreraSedes: { with: { sede: true } },
    },
  });
}

export async function createCarrera(formData: FormData) {
  const validated = carreraSchema.safeParse(parseCarreraForm(formData));
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db.transaction(async (tx) => {
    const [carrera] = await tx
      .insert(carreras)
      .values({
        name: validated.data.name,
        color: validated.data.color,
        visible: validated.data.visible,
      })
      .returning();

    await tx.insert(carreraSedes).values(
      validated.data.sedeIds.map((sedeId) => ({
        carreraId: carrera.id,
        sedeId,
      }))
    );
  });

  revalidateCarreras();
  return { success: true };
}

export async function updateCarrera(id: string, formData: FormData) {
  const validated = carreraSchema.safeParse(parseCarreraForm(formData));
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(carreras)
      .set({
        name: validated.data.name,
        color: validated.data.color,
        visible: validated.data.visible,
        updatedAt: new Date(),
      })
      .where(eq(carreras.id, id));

    await tx.delete(carreraSedes).where(eq(carreraSedes.carreraId, id));
    await tx.insert(carreraSedes).values(
      validated.data.sedeIds.map((sedeId) => ({
        carreraId: id,
        sedeId,
      }))
    );
  });

  revalidateCarreras();
  return { success: true };
}

export async function deleteCarrera(id: string) {
  await db.delete(carreras).where(eq(carreras.id, id));
  revalidateCarreras();
  return { success: true };
}
