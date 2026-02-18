"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { cursadas, cursadaDocentes, asignaturas } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";

const cursadaSchema = z.object({
  aulaId: z.string().uuid("Aula inválida"),
  carreraId: z.string().uuid("Carrera inválida"),
  asignaturaId: z.string().uuid("Asignatura inválida"),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  durationMinutes: z.coerce.number().int().positive("Duración inválida"),
  notes: z.string().optional().nullable(),
  weeklyRepetition: z.boolean().default(true),
  eventDate: z.string().nullable().optional(),
  commissionNumber: z.string().optional().nullable(),
  examen: z.boolean().default(false),
  docenteIds: z.array(z.string().uuid()).optional(),
}).superRefine((data, ctx) => {
  if (data.weeklyRepetition && data.daysOfWeek.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selecciona al menos un día",
      path: ["daysOfWeek"],
    });
  }
  if (!data.weeklyRepetition && !data.eventDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selecciona una fecha",
      path: ["eventDate"],
    });
  }
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

  const today = new Date().toISOString().slice(0, 10);

  return allCursadas.filter((cursada) => {
    if (filters.dayOfWeek !== undefined) {
      if (cursada.weeklyRepetition) {
        if (!cursada.daysOfWeek.includes(filters.dayOfWeek)) return false;
      } else {
        // Non-weekly: show only if eventDate matches today
        if (cursada.eventDate !== today) return false;
      }
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
    // Exclude weekly cursadas outside their asignatura's date range
    if (cursada.weeklyRepetition) {
      if (cursada.asignatura.startDate && today < cursada.asignatura.startDate) return false;
      if (cursada.asignatura.endDate && today > cursada.asignatura.endDate) return false;
    }
    return true;
  });
}

function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function datesOverlap(
  startA: string | null,
  endA: string | null,
  startB: string | null,
  endB: string | null
): boolean {
  // If any date is missing, assume overlap (conservative)
  if (!startA || !endA || !startB || !endB) return true;
  return startA <= endB && startB <= endA;
}

function getDayOfWeekFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

async function checkAulaConflict(
  aulaId: string,
  daysOfWeek: number[],
  startTime: string,
  durationMinutes: number,
  asignaturaId: string,
  isExamen: boolean,
  weeklyRepetition: boolean,
  eventDate: string | null | undefined,
  excludeCursadaId?: string
) {
  // Fetch the new cursada's asignatura to get date range
  const newAsignatura = await db.query.asignaturas.findFirst({
    where: eq(asignaturas.id, asignaturaId),
  });

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
    // Determine if the two cursadas share any day
    let hasSharedDay = false;
    let conflictLabel = "";
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    if (weeklyRepetition && existing.weeklyRepetition) {
      // Both weekly: check shared days of week
      const sharedDays = daysOfWeek.filter((d) => existing.daysOfWeek.includes(d));
      if (sharedDays.length === 0) continue;
      hasSharedDay = true;
      conflictLabel = sharedDays.map((d) => dayNames[d]).join(", ");
    } else if (!weeklyRepetition && !existing.weeklyRepetition) {
      // Both non-weekly: check same event date
      if (!eventDate || eventDate !== existing.eventDate) continue;
      hasSharedDay = true;
      conflictLabel = eventDate;
    } else if (!weeklyRepetition && existing.weeklyRepetition) {
      // New is non-weekly, existing is weekly: check if eventDate falls on one of existing's days
      if (!eventDate) continue;
      const eventDayOfWeek = getDayOfWeekFromDate(eventDate);
      if (!existing.daysOfWeek.includes(eventDayOfWeek)) continue;
      // Also check if eventDate falls within existing's asignatura date range
      if (existing.asignatura.startDate && eventDate < existing.asignatura.startDate) continue;
      if (existing.asignatura.endDate && eventDate > existing.asignatura.endDate) continue;
      hasSharedDay = true;
      conflictLabel = eventDate;
    } else {
      // New is weekly, existing is non-weekly: check if existing's eventDate falls on one of new's days
      if (!existing.eventDate) continue;
      const existingDayOfWeek = getDayOfWeekFromDate(existing.eventDate);
      if (!daysOfWeek.includes(existingDayOfWeek)) continue;
      // Also check if existing's eventDate falls within new's asignatura date range
      if (newAsignatura?.startDate && existing.eventDate < newAsignatura.startDate) continue;
      if (newAsignatura?.endDate && existing.eventDate > newAsignatura.endDate) continue;
      hasSharedDay = true;
      conflictLabel = existing.eventDate;
    }

    if (!hasSharedDay) continue;

    const existingStart = timeToMinutes(existing.startTime);
    const existingEnd = existingStart + existing.durationMinutes;

    // Check time overlap
    if (newStart < existingEnd && existingStart < newEnd) {
      // For two weekly cursadas, also check asignatura date period overlap
      if (weeklyRepetition && existing.weeklyRepetition) {
        const periodsOverlap = datesOverlap(
          newAsignatura?.startDate ?? null,
          newAsignatura?.endDate ?? null,
          existing.asignatura.startDate,
          existing.asignatura.endDate
        );
        if (!periodsOverlap) continue;
      }

      // If this is an examen, allow it
      if (isExamen) continue;

      return `El aula "${existing.aula.name}" ya está ocupada por "${existing.asignatura.name}" el ${conflictLabel} en ese horario`;
    }
  }

  return null;
}

export async function createCursada(formData: FormData) {
  const daysOfWeekRaw = formData.get("daysOfWeek") as string;
  const docenteIdsRaw = formData.get("docenteIds") as string;

  const rawStartTime = formData.get("startTime") as string;

  const data = {
    aulaId: formData.get("aulaId") as string,
    carreraId: formData.get("carreraId") as string,
    asignaturaId: formData.get("asignaturaId") as string,
    daysOfWeek: daysOfWeekRaw ? JSON.parse(daysOfWeekRaw) : [],
    startTime: rawStartTime?.slice(0, 5),
    durationMinutes: parseInt(formData.get("durationMinutes") as string),
    notes: formData.get("notes") as string || null,
    weeklyRepetition: formData.get("weeklyRepetition") === "true",
    eventDate: (formData.get("eventDate") as string) || null,
    commissionNumber: formData.get("commissionNumber") as string || null,
    examen: formData.get("examen") === "true",
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
    validated.data.asignaturaId,
    validated.data.examen,
    validated.data.weeklyRepetition,
    validated.data.eventDate ?? null
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
    eventDate: validated.data.weeklyRepetition ? null : validated.data.eventDate,
    commissionNumber: validated.data.commissionNumber,
    examen: validated.data.examen,
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
  const rawStartTime = formData.get("startTime") as string;

  const data = {
    aulaId: formData.get("aulaId") as string,
    carreraId: formData.get("carreraId") as string,
    asignaturaId: formData.get("asignaturaId") as string,
    daysOfWeek: daysOfWeekRaw ? JSON.parse(daysOfWeekRaw) : [],
    startTime: rawStartTime?.slice(0, 5),
    durationMinutes: parseInt(formData.get("durationMinutes") as string),
    notes: formData.get("notes") as string || null,
    weeklyRepetition: formData.get("weeklyRepetition") === "true",
    eventDate: (formData.get("eventDate") as string) || null,
    commissionNumber: formData.get("commissionNumber") as string || null,
    examen: formData.get("examen") === "true",
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
    validated.data.asignaturaId,
    validated.data.examen,
    validated.data.weeklyRepetition,
    validated.data.eventDate ?? null,
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
      eventDate: validated.data.weeklyRepetition ? null : validated.data.eventDate,
      commissionNumber: validated.data.commissionNumber,
      examen: validated.data.examen,
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
