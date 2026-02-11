"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { docentes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const docenteSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
});

export async function getDocentes() {
  return await db.query.docentes.findMany({
    orderBy: (docentes, { asc }) => [asc(docentes.name)],
  });
}

export async function getDocente(id: string) {
  return await db.query.docentes.findFirst({
    where: eq(docentes.id, id),
  });
}

export async function createDocente(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
  };

  const validated = docenteSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    await db.insert(docentes).values({
      name: validated.data.name,
      email: validated.data.email,
    });
  } catch {
    return { error: { email: ["Este email ya está registrado"] } };
  }

  revalidatePath("/admin/docentes");
  return { success: true };
}

export async function updateDocente(id: string, formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
  };

  const validated = docenteSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    await db
      .update(docentes)
      .set({
        name: validated.data.name,
        email: validated.data.email,
        updatedAt: new Date(),
      })
      .where(eq(docentes.id, id));
  } catch {
    return { error: { email: ["Este email ya está registrado"] } };
  }

  revalidatePath("/admin/docentes");
  return { success: true };
}

export async function deleteDocente(id: string) {
  await db.delete(docentes).where(eq(docentes.id, id));
  revalidatePath("/admin/docentes");
  return { success: true };
}
