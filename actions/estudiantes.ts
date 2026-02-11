"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { estudiantes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const estudianteSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
});

export async function getEstudiantes() {
  return await db.query.estudiantes.findMany({
    orderBy: (estudiantes, { asc }) => [asc(estudiantes.name)],
  });
}

export async function getEstudiante(id: string) {
  return await db.query.estudiantes.findFirst({
    where: eq(estudiantes.id, id),
  });
}

export async function getEstudianteByUserId(userId: string) {
  return await db.query.estudiantes.findFirst({
    where: eq(estudiantes.userId, userId),
  });
}

export async function createEstudiante(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
  };

  const validated = estudianteSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    await db.insert(estudiantes).values({
      name: validated.data.name,
      email: validated.data.email,
    });
  } catch {
    return { error: { email: ["Este email ya está registrado"] } };
  }

  revalidatePath("/admin/estudiantes");
  return { success: true };
}

export async function updateEstudiante(id: string, formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
  };

  const validated = estudianteSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    await db
      .update(estudiantes)
      .set({
        name: validated.data.name,
        email: validated.data.email,
        updatedAt: new Date(),
      })
      .where(eq(estudiantes.id, id));
  } catch {
    return { error: { email: ["Este email ya está registrado"] } };
  }

  revalidatePath("/admin/estudiantes");
  return { success: true };
}

export async function deleteEstudiante(id: string) {
  await db.delete(estudiantes).where(eq(estudiantes.id, id));
  revalidatePath("/admin/estudiantes");
  return { success: true };
}

export async function linkEstudianteToUser(estudianteId: string, userId: string) {
  await db
    .update(estudiantes)
    .set({ userId, updatedAt: new Date() })
    .where(eq(estudiantes.id, estudianteId));

  revalidatePath("/admin/estudiantes");
  return { success: true };
}
