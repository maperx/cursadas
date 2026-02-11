"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { carreras } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const carreraSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido"),
});

export async function getCarreras() {
  return await db.query.carreras.findMany({
    orderBy: (carreras, { asc }) => [asc(carreras.name)],
  });
}

export async function getCarrera(id: string) {
  return await db.query.carreras.findFirst({
    where: eq(carreras.id, id),
  });
}

export async function createCarrera(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    color: formData.get("color") as string,
  };

  const validated = carreraSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db.insert(carreras).values({
    name: validated.data.name,
    color: validated.data.color,
  });

  revalidatePath("/admin/carreras");
  return { success: true };
}

export async function updateCarrera(id: string, formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    color: formData.get("color") as string,
  };

  const validated = carreraSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db
    .update(carreras)
    .set({
      name: validated.data.name,
      color: validated.data.color,
      updatedAt: new Date(),
    })
    .where(eq(carreras.id, id));

  revalidatePath("/admin/carreras");
  return { success: true };
}

export async function deleteCarrera(id: string) {
  await db.delete(carreras).where(eq(carreras.id, id));
  revalidatePath("/admin/carreras");
  return { success: true };
}
