"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { inscripciones } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function getInscripciones() {
  return await db.query.inscripciones.findMany({
    with: {
      user: true,
      cursada: {
        with: {
          asignatura: true,
          carrera: true,
          aula: true,
        },
      },
    },
    orderBy: (inscripciones, { desc }) => [desc(inscripciones.createdAt)],
  });
}

export async function getInscripcionesByUser(userId: string) {
  return await db.query.inscripciones.findMany({
    where: eq(inscripciones.userId, userId),
    with: {
      cursada: {
        with: {
          asignatura: true,
          carrera: true,
          aula: true,
          cursadaDocentes: {
            with: {
              user: true,
            },
          },
        },
      },
    },
    orderBy: (inscripciones, { desc }) => [desc(inscripciones.createdAt)],
  });
}

export async function createInscripcion(userId: string, cursadaId: string) {
  // Check if already enrolled
  const existing = await db.query.inscripciones.findFirst({
    where: and(
      eq(inscripciones.userId, userId),
      eq(inscripciones.cursadaId, cursadaId)
    ),
  });

  if (existing) {
    if (existing.status === "baja") {
      // Re-activate the inscription
      await db
        .update(inscripciones)
        .set({ status: "activa", updatedAt: new Date() })
        .where(eq(inscripciones.id, existing.id));

      revalidatePath("/mis-cursadas");
      revalidatePath("/admin/inscripciones");
      return { success: true };
    }
    return { error: "Ya estás inscripto en esta cursada" };
  }

  await db.insert(inscripciones).values({
    userId,
    cursadaId,
  });

  revalidatePath("/mis-cursadas");
  revalidatePath("/admin/inscripciones");
  return { success: true };
}

export async function darDeBajaInscripcion(inscripcionId: string) {
  await db
    .update(inscripciones)
    .set({ status: "baja", updatedAt: new Date() })
    .where(eq(inscripciones.id, inscripcionId));

  revalidatePath("/mis-cursadas");
  revalidatePath("/admin/inscripciones");
  return { success: true };
}

export async function deleteInscripcion(id: string) {
  await db.delete(inscripciones).where(eq(inscripciones.id, id));

  revalidatePath("/mis-cursadas");
  revalidatePath("/admin/inscripciones");
  return { success: true };
}
