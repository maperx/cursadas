"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUsers() {
  return await db.query.user.findMany({
    orderBy: (user, { asc }) => [asc(user.name)],
  });
}

export async function getUser(id: string) {
  return await db.query.user.findFirst({
    where: eq(user.id, id),
  });
}

export async function getDocentes() {
  return await db.query.user.findMany({
    where: eq(user.role, "docente"),
    orderBy: (user, { asc }) => [asc(user.name)],
  });
}

export async function getEstudiantes() {
  return await db.query.user.findMany({
    where: eq(user.role, "estudiante"),
    orderBy: (user, { asc }) => [asc(user.name)],
  });
}

export async function validateDocenteCode(code: string) {
  return { valid: code === process.env.DOCENTE_REGISTER_CODE };
}

export async function setDocenteRole(email: string, code: string) {
  if (code !== process.env.DOCENTE_REGISTER_CODE) {
    return { success: false, error: "Código de docente inválido" };
  }
  await db
    .update(user)
    .set({ role: "docente", updatedAt: new Date() })
    .where(eq(user.email, email));
  return { success: true };
}

export async function updateUserRole(userId: string, role: string) {
  await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.id, userId));

  revalidatePath("/admin/usuarios");
  return { success: true };
}
