"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { cursadas, cursadaDocentes } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";

const cursadaSchema = z.object({
  aulaId: z.string().uuid("Aula inválida"),
  carreraId: z.string().uuid("Carrera inválida"),
  asignaturaId: z.string().uuid("Asignatura inválida"),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, "Selecciona al menos un día"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  durationMinutes: z.coerce.number().int().positive("Duración inválida"),
  notes: z.string().optional().nullable(),
  weeklyRepetition: z.boolean().default(true),
  commissionNumber: z.string().optional().nullable(),
  docenteIds: z.array(z.string().uuid()).optional(),
});

export async function getCursadas() {
  return await db.query.cursadas.findMany({
    with: {
      aula: true,
      carrera: true,
      asignatura: true,
      cursadaDocentes: {
        with: {
          docente: true,
        },
      },
    },
    orderBy: (cursadas, { asc }) => [asc(cursadas.startTime)],
  });
}

export async function getCursada(id: string) {
  return await db.query.cursadas.findFirst({
    where: eq(cursadas.id, id),
    with: {
      aula: true,
      carrera: true,
      asignatura: true,
      cursadaDocentes: {
        with: {
          docente: true,
        },
      },
    },
  });
}

export async function getCursadasByDay(dayOfWeek: number) {
  // Get all cursadas that include the specified day
  const allCursadas = await db.query.cursadas.findMany({
    with: {
      aula: true,
      carrera: true,
      asignatura: true,
      cursadaDocentes: {
        with: {
          docente: true,
        },
      },
    },
  });

  return allCursadas.filter((cursada) =>
    cursada.daysOfWeek.includes(dayOfWeek)
  );
}

export async function getCursadasByFilters(filters: {
  dayOfWeek?: number;
  carreraId?: string;
  asignaturaId?: string;
  aulaId?: string;
}) {
  const allCursadas = await db.query.cursadas.findMany({
    with: {
      aula: true,
      carrera: true,
      asignatura: true,
      cursadaDocentes: {
        with: {
          docente: true,
        },
      },
    },
  });

  return allCursadas.filter((cursada) => {
    if (filters.dayOfWeek !== undefined && !cursada.daysOfWeek.includes(filters.dayOfWeek)) {
      return false;
    }
    if (filters.carreraId && cursada.carreraId !== filters.carreraId) {
      return false;
    }
    if (filters.asignaturaId && cursada.asignaturaId !== filters.asignaturaId) {
      return false;
    }
    if (filters.aulaId && cursada.aulaId !== filters.aulaId) {
      return false;
    }
    return true;
  });
}

function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

async function checkAulaConflict(
  aulaId: string,
  daysOfWeek: number[],
  startTime: string,
  durationMinutes: number,
  excludeCursadaId?: string
) {
  const existingCursadas = await db.query.cursadas.findMany({
    where: excludeCursadaId
      ? and(eq(cursadas.aulaId, aulaId), ne(cursadas.id, excludeCursadaId))
      : eq(cursadas.aulaId, aulaId),
    with: {
      asignatura: true,
      aula: true,
    },
  });

  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + durationMinutes;

  for (const existing of existingCursadas) {
    const sharedDays = daysOfWeek.filter((d) =>
      existing.daysOfWeek.includes(d)
    );
    if (sharedDays.length === 0) continue;

    const existingStart = timeToMinutes(existing.startTime);
    const existingEnd = existingStart + existing.durationMinutes;

    if (newStart < existingEnd && existingStart < newEnd) {
      const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const conflictDays = sharedDays.map((d) => dayNames[d]).join(", ");
      return `El aula "${existing.aula.name}" ya está ocupada por "${existing.asignatura.name}" los días ${conflictDays} en ese horario`;
    }
  }

  return null;
}

export async function createCursada(formData: FormData) {
  const daysOfWeekRaw = formData.get("daysOfWeek") as string;
  const docenteIdsRaw = formData.get("docenteIds") as string;

  const data = {
    aulaId: formData.get("aulaId") as string,
    carreraId: formData.get("carreraId") as string,
    asignaturaId: formData.get("asignaturaId") as string,
    daysOfWeek: daysOfWeekRaw ? JSON.parse(daysOfWeekRaw) : [],
    startTime: formData.get("startTime") as string,
    durationMinutes: parseInt(formData.get("durationMinutes") as string),
    notes: formData.get("notes") as string || null,
    weeklyRepetition: formData.get("weeklyRepetition") === "true",
    commissionNumber: formData.get("commissionNumber") as string || null,
    docenteIds: docenteIdsRaw ? JSON.parse(docenteIdsRaw) : [],
  };

  const validated = cursadaSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const conflict = await checkAulaConflict(
    validated.data.aulaId,
    validated.data.daysOfWeek,
    validated.data.startTime,
    validated.data.durationMinutes
  );
  if (conflict) {
    return { error: { _form: [conflict] } };
  }

  const [newCursada] = await db.insert(cursadas).values({
    aulaId: validated.data.aulaId,
    carreraId: validated.data.carreraId,
    asignaturaId: validated.data.asignaturaId,
    daysOfWeek: validated.data.daysOfWeek,
    startTime: validated.data.startTime,
    durationMinutes: validated.data.durationMinutes,
    notes: validated.data.notes,
    weeklyRepetition: validated.data.weeklyRepetition,
    commissionNumber: validated.data.commissionNumber,
  }).returning();

  // Add docentes if any
  if (validated.data.docenteIds && validated.data.docenteIds.length > 0) {
    await db.insert(cursadaDocentes).values(
      validated.data.docenteIds.map((docenteId) => ({
        cursadaId: newCursada.id,
        docenteId,
      }))
    );
  }

  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true };
}

export async function updateCursada(id: string, formData: FormData) {
  const daysOfWeekRaw = formData.get("daysOfWeek") as string;
  const docenteIdsRaw = formData.get("docenteIds") as string;

  const data = {
    aulaId: formData.get("aulaId") as string,
    carreraId: formData.get("carreraId") as string,
    asignaturaId: formData.get("asignaturaId") as string,
    daysOfWeek: daysOfWeekRaw ? JSON.parse(daysOfWeekRaw) : [],
    startTime: formData.get("startTime") as string,
    durationMinutes: parseInt(formData.get("durationMinutes") as string),
    notes: formData.get("notes") as string || null,
    weeklyRepetition: formData.get("weeklyRepetition") === "true",
    commissionNumber: formData.get("commissionNumber") as string || null,
    docenteIds: docenteIdsRaw ? JSON.parse(docenteIdsRaw) : [],
  };

  const validated = cursadaSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const conflict = await checkAulaConflict(
    validated.data.aulaId,
    validated.data.daysOfWeek,
    validated.data.startTime,
    validated.data.durationMinutes,
    id
  );
  if (conflict) {
    return { error: { _form: [conflict] } };
  }

  await db
    .update(cursadas)
    .set({
      aulaId: validated.data.aulaId,
      carreraId: validated.data.carreraId,
      asignaturaId: validated.data.asignaturaId,
      daysOfWeek: validated.data.daysOfWeek,
      startTime: validated.data.startTime,
      durationMinutes: validated.data.durationMinutes,
      notes: validated.data.notes,
      weeklyRepetition: validated.data.weeklyRepetition,
      commissionNumber: validated.data.commissionNumber,
      updatedAt: new Date(),
    })
    .where(eq(cursadas.id, id));

  // Update docentes - delete all and re-add
  await db.delete(cursadaDocentes).where(eq(cursadaDocentes.cursadaId, id));

  if (validated.data.docenteIds && validated.data.docenteIds.length > 0) {
    await db.insert(cursadaDocentes).values(
      validated.data.docenteIds.map((docenteId) => ({
        cursadaId: id,
        docenteId,
      }))
    );
  }

  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true };
}

export async function deleteCursada(id: string) {
  await db.delete(cursadas).where(eq(cursadas.id, id));
  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true };
}
