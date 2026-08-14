"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  cursadas,
  cursadaDocentes,
  cursadaSuspensiones,
  asignaturas,
  aulas,
  carreraSedes,
} from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { requireCursadaPermission, requirePermission } from "@/lib/auth-server";
import { sedesCon } from "@/lib/permissions";

// La sede de una cursada es la de su aula: los permisos de cursadas se
// otorgan sede por sede, así que toda mutación se valida contra esa sede.
async function sedeDeAula(aulaId: string) {
  const aula = await db.query.aulas.findFirst({
    where: eq(aulas.id, aulaId),
    columns: { sedeId: true },
  });
  return aula?.sedeId ?? null;
}

// Además de la sede, el permiso depende de si la cursada es un evento: hay
// usuarios habilitados únicamente sobre las que llevan el tilde Evento.
async function cursadaParaPermisos(cursadaId: string) {
  const cursada = await db.query.cursadas.findFirst({
    where: eq(cursadas.id, cursadaId),
    columns: { examen: true },
    with: { aula: { columns: { sedeId: true } } },
  });
  if (!cursada) return null;
  return { sedeId: cursada.aula.sedeId, examen: cursada.examen };
}


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
  docenteIds: z.array(z.string()).optional(),
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
  const { perms } = await requirePermission("cursadas", "view");

  const rows = await db.query.cursadas.findMany({
    with: {
      aula: { with: { sede: true } },
      carrera: true,
      asignatura: {
        with: { recesos: true },
      },
      cursadaDocentes: {
        with: {
          user: true,
        },
      },
      suspensiones: true,
    },
    orderBy: (cursadas, { asc }) => [asc(cursadas.startTime)],
  });

  if (perms.superadmin) return rows;

  const sedesVisibles = new Set(sedesCon(perms, "view"));
  return rows.filter((cursada) => sedesVisibles.has(cursada.aula.sedeId));
}

export async function getCursada(id: string) {
  return await db.query.cursadas.findFirst({
    where: eq(cursadas.id, id),
    with: {
      aula: { with: { sede: true } },
      carrera: true,
      asignatura: {
        with: { recesos: true },
      },
      cursadaDocentes: {
        with: {
          user: true,
        },
      },
      suspensiones: true,
    },
  });
}

export async function getCursadasByDocente(userId: string) {
  const results = await db.query.cursadaDocentes.findMany({
    where: eq(cursadaDocentes.userId, userId),
    with: {
      cursada: {
        with: {
          aula: { with: { sede: true } },
          carrera: true,
          asignatura: { with: { recesos: true } },
          cursadaDocentes: { with: { user: true } },
          suspensiones: true,
        },
      },
    },
  });
  return results.map((r) => r.cursada);
}

export async function getCursadasByDay(dayOfWeek: number) {
  // Get all cursadas that include the specified day
  const allCursadas = await db.query.cursadas.findMany({
    with: {
      aula: { with: { sede: true } },
      carrera: true,
      asignatura: { with: { recesos: true } },
      cursadaDocentes: {
        with: {
          user: true,
        },
      },
      suspensiones: true,
    },
  });

  return allCursadas.filter((cursada) =>
    cursada.daysOfWeek.includes(dayOfWeek)
  );
}

export async function hasExamenes(): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const allExams = await db.query.cursadas.findMany({
    where: eq(cursadas.examen, true),
    with: { asignatura: { with: { recesos: true } }, carrera: true },
  });
  return allExams.some((exam) => {
    if (!exam.carrera.visible || !exam.asignatura.visible) return false;
    if (exam.weeklyRepetition) {
      if (exam.asignatura.startDate && today < exam.asignatura.startDate) return false;
      if (exam.asignatura.endDate && today > exam.asignatura.endDate) return false;
      if (isDateInRecesos(today, exam.asignatura.recesos)) return false;
      return true;
    } else {
      return !!exam.eventDate && exam.eventDate >= today;
    }
  });
}

export async function hasExamenesForDay(dayOfWeek: number): Promise<boolean> {
  const allExams = await db.query.cursadas.findMany({
    where: eq(cursadas.examen, true),
    with: { asignatura: { with: { recesos: true } }, carrera: true },
  });

  const today = new Date().toISOString().slice(0, 10);

  return allExams.some((exam) => {
    if (!exam.carrera.visible || !exam.asignatura.visible) return false;
    if (exam.weeklyRepetition) {
      if (!exam.daysOfWeek.includes(dayOfWeek)) return false;
      if (exam.asignatura.startDate && today < exam.asignatura.startDate) return false;
      if (exam.asignatura.endDate && today > exam.asignatura.endDate) return false;
      if (isDateInRecesos(today, exam.asignatura.recesos)) return false;
      return true;
    } else {
      if (!exam.eventDate) return false;
      // Exclude past single-event exams
      if (exam.eventDate < today) return false;
      const [y, m, d] = exam.eventDate.split("-").map(Number);
      return new Date(y, m - 1, d).getDay() === dayOfWeek;
    }
  });
}

export async function getCursadasByFilters(filters: {
  dayOfWeek?: number;
  sedeId?: string;
  carreraId?: string;
  asignaturaId?: string;
  aulaId?: string;
  vista?: string;
}) {
  const allCursadas = await db.query.cursadas.findMany({
    with: {
      aula: { with: { sede: true } },
      carrera: true,
      asignatura: { with: { recesos: true } },
      cursadaDocentes: {
        with: {
          user: true,
        },
      },
      suspensiones: true,
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  // Calculate current week range (Monday to Sunday)
  const now = new Date();
  const dow = now.getDay(); // 0=Sunday
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = monday.toISOString().slice(0, 10);
  const weekEnd = sunday.toISOString().slice(0, 10);

  const filtered = allCursadas.filter((cursada) => {
    // Hide cursadas from non-visible carreras/asignaturas on public page
    if (!cursada.carrera.visible || !cursada.asignatura.visible) return false;
    if (filters.dayOfWeek !== undefined) {
      if (cursada.weeklyRepetition) {
        if (!cursada.daysOfWeek.includes(filters.dayOfWeek)) return false;
      } else {
        if (!cursada.eventDate) return false;
        const eventDayOfWeek = getDayOfWeekFromDate(cursada.eventDate);
        if (eventDayOfWeek !== filters.dayOfWeek) return false;
      }
    }
    // La sede de una cursada es la de su aula.
    if (filters.sedeId && cursada.aula.sedeId !== filters.sedeId) return false;
    if (filters.carreraId && cursada.carreraId !== filters.carreraId) return false;
    if (filters.asignaturaId && cursada.asignaturaId !== filters.asignaturaId) return false;
    if (filters.aulaId && cursada.aulaId !== filters.aulaId) return false;
    // In weekly view, let the client component filter by the selected week
    if (filters.vista !== "semanal") {
      // Exclude weekly cursadas outside their asignatura's date range
      if (cursada.weeklyRepetition) {
        if (cursada.asignatura.startDate && today < cursada.asignatura.startDate) return false;
        if (cursada.asignatura.endDate && today > cursada.asignatura.endDate) return false;
        // Hide weekly cursadas during a receso period
        if (isDateInRecesos(today, cursada.asignatura.recesos)) return false;
      }
      // Single-date events: only show if within current week
      if (!cursada.weeklyRepetition) {
        if (!cursada.eventDate) return false;
        if (cursada.eventDate < weekStart || cursada.eventDate > weekEnd) return false;
      }
    }
    return true;
  });

  // Event priority: eventos (examen=true) displace cursadas in same aula + overlapping time
  const eventos = filtered.filter(c => c.examen);
  const cursadasRegulares = filtered.filter(c => !c.examen);

  const remainingCursadas = cursadasRegulares.filter(cursada => {
    return !eventos.some(evento => {
      if (evento.aulaId !== cursada.aulaId) return false;
      // When no dayOfWeek filter, check that they share a day
      if (filters.dayOfWeek === undefined) {
        let shareDay = false;
        if (evento.weeklyRepetition && cursada.weeklyRepetition) {
          shareDay = cursada.daysOfWeek.some(d => evento.daysOfWeek.includes(d));
        } else if (!evento.weeklyRepetition && cursada.weeklyRepetition && evento.eventDate) {
          shareDay = cursada.daysOfWeek.includes(getDayOfWeekFromDate(evento.eventDate));
        } else if (evento.weeklyRepetition && !cursada.weeklyRepetition && cursada.eventDate) {
          shareDay = evento.daysOfWeek.includes(getDayOfWeekFromDate(cursada.eventDate));
        } else if (!evento.weeklyRepetition && !cursada.weeklyRepetition) {
          shareDay = cursada.eventDate === evento.eventDate;
        }
        if (!shareDay) return false;
      }
      // Check time overlap
      const cStart = timeToMinutes(cursada.startTime);
      const cEnd = cStart + cursada.durationMinutes;
      const eStart = timeToMinutes(evento.startTime);
      const eEnd = eStart + evento.durationMinutes;
      return cStart < eEnd && eStart < cEnd;
    });
  });

  // For the day-list view each cursada resolves to one concrete date, so we can
  // attach the matching suspension (if any). In the weekly view the client
  // resolves suspensions per column date from the `suspensiones` array instead.
  const isSemanal = filters.vista === "semanal";
  const dayListDow = filters.dayOfWeek ?? new Date().getDay();
  const dayListDate = dateOfDowInWeek(monday, dayListDow);

  const result = [...eventos, ...remainingCursadas].map((cursada) => {
    let suspension: { date: string; observacion: string | null } | null = null;
    if (!isSemanal) {
      const occurrenceDate = cursada.weeklyRepetition
        ? dayListDate
        : cursada.eventDate;
      if (occurrenceDate) {
        suspension =
          cursada.suspensiones.find((s) => s.date === occurrenceDate) ?? null;
      }
    }
    return { ...cursada, suspension };
  });

  return result;
}

/** Date (YYYY-MM-DD) of the given day-of-week within the week starting at `monday`. */
function dateOfDowInWeek(monday: Date, dayOfWeek: number): string {
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0 ... Sun=6
  const d = new Date(monday);
  d.setDate(monday.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function isDateInRecesos(
  date: string,
  recesos: { startDate: string; endDate: string }[]
): boolean {
  return recesos.some((r) => date >= r.startDate && date <= r.endDate);
}

/**
 * ¿Se solapan dos periodos? Un extremo nulo se interpreta como abierto (sin
 * límite), no como "solapa siempre": una asignatura sin fecha de fin sigue
 * vigente, pero una que terminó antes de que empiece la otra no se solapa.
 */
function datesOverlap(
  startA: string | null,
  endA: string | null,
  startB: string | null,
  endB: string | null
): boolean {
  if (startA && endB && startA > endB) return false;
  if (startB && endA && startB > endA) return false;
  return true;
}

/**
 * Periodo del calendario que ocupa una cursada: el de su asignatura si es
 * semanal, o su fecha puntual si es un evento de un solo día.
 */
function periodoDeCursada(
  weeklyRepetition: boolean,
  eventDate: string | null,
  asignaturaStartDate: string | null | undefined,
  asignaturaEndDate: string | null | undefined
): { start: string | null; end: string | null } {
  if (weeklyRepetition) {
    return { start: asignaturaStartDate ?? null, end: asignaturaEndDate ?? null };
  }
  return { start: eventDate, end: eventDate };
}

function getDayOfWeekFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * La sede de una cursada es la del aula elegida: la carrera tiene que dictarse
 * en esa sede. Devuelve el mensaje de error, o null si es válida.
 */
async function checkCarreraEnSedeDelAula(
  aulaId: string,
  carreraId: string
): Promise<string | null> {
  const aula = await db.query.aulas.findFirst({
    where: eq(aulas.id, aulaId),
    with: { sede: true },
  });
  if (!aula) return "El aula seleccionada no existe";

  const enSede = await db.query.carreraSedes.findFirst({
    where: and(
      eq(carreraSedes.carreraId, carreraId),
      eq(carreraSedes.sedeId, aula.sedeId)
    ),
  });
  if (!enSede) {
    return `La carrera seleccionada no se dicta en la sede ${aula.sede.name}`;
  }
  return null;
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
): Promise<{ error: string | null; warnings: string[] }> {
  // Fetch the new cursada's asignatura to get date range and recesos
  const newAsignatura = await db.query.asignaturas.findFirst({
    where: eq(asignaturas.id, asignaturaId),
    with: { recesos: true },
  });

  const existingCursadas = await db.query.cursadas.findMany({
    where: excludeCursadaId
      ? and(eq(cursadas.aulaId, aulaId), ne(cursadas.id, excludeCursadaId))
      : eq(cursadas.aulaId, aulaId),
    with: {
      asignatura: { with: { recesos: true } },
      aula: { with: { sede: true } },
    },
  });

  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + durationMinutes;
  const warnings: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  const nuevoPeriodo = periodoDeCursada(
    weeklyRepetition,
    eventDate ?? null,
    newAsignatura?.startDate,
    newAsignatura?.endDate
  );

  for (const existing of existingCursadas) {
    const existingPeriodo = periodoDeCursada(
      existing.weeklyRepetition,
      existing.eventDate,
      existing.asignatura.startDate,
      existing.asignatura.endDate
    );

    // Una cursada que ya terminó no ocupa el aula: no puede generar conflicto.
    if (existingPeriodo.end && existingPeriodo.end < today) continue;

    // Los periodos de ambas cursadas tienen que solaparse en el calendario.
    if (
      !datesOverlap(
        nuevoPeriodo.start,
        nuevoPeriodo.end,
        existingPeriodo.start,
        existingPeriodo.end
      )
    ) {
      continue;
    }

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
      // Skip conflict if eventDate falls within a receso of existing's asignatura
      if (isDateInRecesos(eventDate, existing.asignatura.recesos)) continue;
      hasSharedDay = true;
      conflictLabel = eventDate;
    } else {
      // New is weekly, existing is non-weekly: check if existing's eventDate falls on one of new's days
      if (!existing.eventDate) continue;
      const existingDayOfWeek = getDayOfWeekFromDate(existing.eventDate);
      if (!daysOfWeek.includes(existingDayOfWeek)) continue;
      // Skip conflict if existing's eventDate falls within a receso of new's asignatura
      if (newAsignatura && isDateInRecesos(existing.eventDate, newAsignatura.recesos)) continue;
      hasSharedDay = true;
      conflictLabel = existing.eventDate;
    }

    if (!hasSharedDay) continue;

    const existingStart = timeToMinutes(existing.startTime);
    const existingEnd = existingStart + existing.durationMinutes;

    // Check time overlap
    if (newStart < existingEnd && existingStart < newEnd) {
      const message = `El aula "${existing.aula.name}" ya está ocupada por "${existing.asignatura.name}" el ${conflictLabel} en ese horario`;

      // If this is an examen, collect as warning instead of blocking
      if (isExamen) {
        warnings.push(message);
        continue;
      }

      return { error: message, warnings: [] };
    }
  }

  return { error: null, warnings };
}

export async function createCursada(formData: FormData) {
  const daysOfWeekRaw = formData.get("daysOfWeek") as string;
  const docenteIdsRaw = formData.get("docenteIds") as string;
  const skipConflictCheck = formData.get("skipConflictCheck") === "true";

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

  const sedeDestino = await sedeDeAula(validated.data.aulaId);
  if (!sedeDestino) {
    return { error: { _form: ["El aula seleccionada no existe"] } };
  }
  await requireCursadaPermission("edit", sedeDestino, validated.data.examen);

  const sedeError = await checkCarreraEnSedeDelAula(
    validated.data.aulaId,
    validated.data.carreraId
  );
  if (sedeError) {
    return { error: { _form: [sedeError] } };
  }

  if (!skipConflictCheck) {
    const { error: conflict, warnings } = await checkAulaConflict(
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
    if (warnings.length > 0) {
      return { error: { _warning: warnings } };
    }
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
      validated.data.docenteIds.map((userId) => ({
        cursadaId: newCursada.id,
        userId,
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
  const skipConflictCheck = formData.get("skipConflictCheck") === "true";
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

  const actual = await cursadaParaPermisos(id);
  if (!actual) {
    return { error: { _form: ["La cursada no existe"] } };
  }
  // Hace falta poder con la cursada como está y como queda: quien solo maneja
  // eventos no puede tocar una cursada común ni quitarle el tilde Evento.
  await requireCursadaPermission("edit", actual.sedeId, actual.examen);
  await requireCursadaPermission(
    "edit",
    actual.sedeId,
    validated.data.examen
  );

  const sedeDestino = await sedeDeAula(validated.data.aulaId);
  if (!sedeDestino) {
    return { error: { _form: ["El aula seleccionada no existe"] } };
  }
  // Mover una cursada a otra sede exige permiso también en la sede destino.
  await requireCursadaPermission("edit", sedeDestino, validated.data.examen);

  const sedeError = await checkCarreraEnSedeDelAula(
    validated.data.aulaId,
    validated.data.carreraId
  );
  if (sedeError) {
    return { error: { _form: [sedeError] } };
  }

  if (!skipConflictCheck) {
    const { error: conflict, warnings } = await checkAulaConflict(
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
    if (warnings.length > 0) {
      return { error: { _warning: warnings } };
    }
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
      validated.data.docenteIds.map((userId) => ({
        cursadaId: id,
        userId,
      }))
    );
  }

  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true };
}

export async function deleteCursada(id: string) {
  const actual = await cursadaParaPermisos(id);
  if (!actual) {
    return { error: "La cursada no existe" };
  }
  await requireCursadaPermission("delete", actual.sedeId, actual.examen);

  await db.delete(cursadas).where(eq(cursadas.id, id));
  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true };
}

const suspensionSchema = z.object({
  cursadaId: z.string().uuid("Cursada inválida"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  observacion: z.string().trim().max(500, "La observación es muy larga").optional(),
});

/**
 * Marca una repetición puntual (cursada + fecha) como suspendida con una
 * observación opcional. Si ya existía una suspensión para esa fecha, actualiza
 * la observación. No afecta las demás repeticiones de la cursada.
 */
export async function suspendCursadaRepeticion(input: {
  cursadaId: string;
  date: string;
  observacion?: string;
}) {
  const validated = suspensionSchema.safeParse(input);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const { cursadaId, date, observacion } = validated.data;
  const actual = await cursadaParaPermisos(cursadaId);
  if (!actual) {
    return { error: { _form: ["La cursada no existe"] } };
  }
  await requireCursadaPermission("edit", actual.sedeId, actual.examen);

  await db
    .insert(cursadaSuspensiones)
    .values({ cursadaId, date, observacion: observacion || null })
    .onConflictDoUpdate({
      target: [cursadaSuspensiones.cursadaId, cursadaSuspensiones.date],
      set: { observacion: observacion || null },
    });

  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true };
}

/** Quita la suspensión de una repetición puntual (cursada + fecha). */
export async function removeCursadaSuspension(input: {
  cursadaId: string;
  date: string;
}) {
  const validated = suspensionSchema
    .pick({ cursadaId: true, date: true })
    .safeParse(input);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const actual = await cursadaParaPermisos(validated.data.cursadaId);
  if (!actual) {
    return { error: { _form: ["La cursada no existe"] } };
  }
  await requireCursadaPermission("edit", actual.sedeId, actual.examen);

  await db
    .delete(cursadaSuspensiones)
    .where(
      and(
        eq(cursadaSuspensiones.cursadaId, validated.data.cursadaId),
        eq(cursadaSuspensiones.date, validated.data.date)
      )
    );

  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true };
}
