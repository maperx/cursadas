"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { aulas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const aulaSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  building: z.string().min(1, "El edificio es requerido"),
  capacity: z.coerce.number().int().positive().optional().nullable(),
});

export async function getAulas() {
  return await db.query.aulas.findMany({
    orderBy: (aulas, { asc }) => [asc(aulas.building), asc(aulas.name)],
  });
}

export async function getAula(id: string) {
  return await db.query.aulas.findFirst({
    where: eq(aulas.id, id),
  });
}

export async function createAula(formData: FormData) {
  const capacityValue = formData.get("capacity");
  const data = {
    name: formData.get("name") as string,
    building: formData.get("building") as string,
    capacity: capacityValue ? parseInt(capacityValue as string) : null,
  };

  const validated = aulaSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db.insert(aulas).values({
    name: validated.data.name,
    building: validated.data.building,
    capacity: validated.data.capacity,
  });

  revalidatePath("/admin/aulas");
  return { success: true };
}

export async function updateAula(id: string, formData: FormData) {
  const capacityValue = formData.get("capacity");
  const data = {
    name: formData.get("name") as string,
    building: formData.get("building") as string,
    capacity: capacityValue ? parseInt(capacityValue as string) : null,
  };

  const validated = aulaSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db
    .update(aulas)
    .set({
      name: validated.data.name,
      building: validated.data.building,
      capacity: validated.data.capacity,
      updatedAt: new Date(),
    })
    .where(eq(aulas.id, id));

  revalidatePath("/admin/aulas");
  return { success: true };
}

export async function deleteAula(id: string) {
  await db.delete(aulas).where(eq(aulas.id, id));
  revalidatePath("/admin/aulas");
  return { success: true };
}
