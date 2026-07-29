"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { aulas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-server";

const aulaSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  building: z.string().min(1, "El edificio es requerido"),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  sedeId: z.string().uuid("La sede es requerida"),
});

function parseAulaForm(formData: FormData) {
  const capacityValue = formData.get("capacity");
  return {
    name: formData.get("name") as string,
    building: formData.get("building") as string,
    capacity: capacityValue ? parseInt(capacityValue as string) : null,
    sedeId: formData.get("sedeId") as string,
  };
}

function revalidateAulas() {
  revalidatePath("/admin/aulas");
  revalidatePath("/admin/cursadas");
  revalidatePath("/admin/sedes");
  revalidatePath("/");
}

export async function getAulas() {
  return await db.query.aulas.findMany({
    with: { sede: true },
    orderBy: (aulas, { asc }) => [asc(aulas.building), asc(aulas.name)],
  });
}

export async function getAula(id: string) {
  return await db.query.aulas.findFirst({
    where: eq(aulas.id, id),
    with: { sede: true },
  });
}

export async function createAula(formData: FormData) {
  await requirePermission("aulas", "edit");

  const validated = aulaSchema.safeParse(parseAulaForm(formData));
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db.insert(aulas).values({
    name: validated.data.name,
    building: validated.data.building,
    capacity: validated.data.capacity,
    sedeId: validated.data.sedeId,
  });

  revalidateAulas();
  return { success: true };
}

export async function updateAula(id: string, formData: FormData) {
  await requirePermission("aulas", "edit");

  const validated = aulaSchema.safeParse(parseAulaForm(formData));
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db
    .update(aulas)
    .set({
      name: validated.data.name,
      building: validated.data.building,
      capacity: validated.data.capacity,
      sedeId: validated.data.sedeId,
      updatedAt: new Date(),
    })
    .where(eq(aulas.id, id));

  revalidateAulas();
  return { success: true };
}

export async function deleteAula(id: string) {
  await requirePermission("aulas", "delete");
  await db.delete(aulas).where(eq(aulas.id, id));
  revalidateAulas();
  return { success: true };
}
