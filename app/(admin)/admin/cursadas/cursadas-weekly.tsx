"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDayFullName, formatTime, addMinutesToTime } from "@/lib/utils";
import { CursadaDialog } from "./cursada-dialog";
import { Pencil } from "lucide-react";

type Carrera = {
  id: string;
  name: string;
  color: string;
};

type Aula = {
  id: string;
  name: string;
  building: string;
  capacity: number | null;
};

type Cursada = {
  id: string;
  aulaId: string;
  carreraId: string;
  asignaturaId: string;
  daysOfWeek: number[];
  startTime: string;
  durationMinutes: number;
  notes: string | null;
  weeklyRepetition: boolean;
  commissionNumber: string | null;
  examen: boolean;
  createdAt: Date;
  updatedAt: Date;
  aula: Aula;
  carrera: Carrera;
  asignatura: { id: string; name: string; startDate: string | null; endDate: string | null };
  cursadaDocentes: {
    docente: { id: string; name: string; email: string };
  }[];
};

type Asignatura = {
  id: string;
  name: string;
  carreraId: string;
};

type Docente = {
  id: string;
  name: string;
  email: string;
};

interface CursadasWeeklyProps {
  data: Cursada[];
  carreras: Carrera[];
  asignaturas: Asignatura[];
  docentes: Docente[];
  aulas: Aula[];
}

const PIXELS_PER_MINUTE = 1.5;
const DAYS = [1, 2, 3, 4, 5, 6]; // Lunes a Sábado

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Compute vertical top positions pushing overlapping blocks down so they stack vertically. */
function computeVerticalLayout(
  cursadas: Cursada[],
  gridStartMinutes: number
): Map<string, number> {
  const result = new Map<string, number>();
  if (cursadas.length === 0) return result;

  const sorted = [...cursadas].sort((a, b) => {
    const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (diff !== 0) return diff;
    return a.durationMinutes - b.durationMinutes;
  });

  // Track the visual bottom (in px) of each placed block
  const placedBottoms: { top: number; bottom: number }[] = [];
  const GAP = 2; // px gap between stacked blocks

  for (const cursada of sorted) {
    const naturalTop =
      (timeToMinutes(cursada.startTime) - gridStartMinutes) * PIXELS_PER_MINUTE;
    const height = cursada.durationMinutes * PIXELS_PER_MINUTE;

    // Find the lowest top position that doesn't overlap with any placed block
    let top = naturalTop;
    let hasConflict = true;
    while (hasConflict) {
      hasConflict = false;
      for (const placed of placedBottoms) {
        // Check if this block would overlap vertically with the placed block
        if (top < placed.bottom && top + height > placed.top) {
          top = placed.bottom + GAP;
          hasConflict = true;
          break;
        }
      }
    }

    placedBottoms.push({ top, bottom: top + height });
    result.set(cursada.id, top);
  }

  return result;
}

export function CursadasWeekly({ data, carreras, asignaturas, docentes, aulas }: CursadasWeeklyProps) {
  const activeData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return data.filter((c) => {
      if (c.asignatura.startDate && today < c.asignatura.startDate) return false;
      if (c.asignatura.endDate && today > c.asignatura.endDate) return false;
      return true;
    });
  }, [data]);

  if (activeData.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-muted-foreground">No hay cursadas para mostrar</p>
      </div>
    );
  }

  // Calculate grid time range from activeData
  let minHour = 24;
  let maxHour = 0;

  for (const cursada of activeData) {
    const startMins = timeToMinutes(cursada.startTime);
    const endMins = startMins + cursada.durationMinutes;
    const startH = Math.floor(startMins / 60);
    const endH = Math.ceil(endMins / 60);
    if (startH < minHour) minHour = startH;
    if (endH > maxHour) maxHour = endH;
  }

  const gridStartMinutes = minHour * 60;
  const gridEndMinutes = maxHour * 60;
  const baseHeight = (gridEndMinutes - gridStartMinutes) * PIXELS_PER_MINUTE;
  const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);

  // Group cursadas by day
  const cursadasByDay = new Map<number, Cursada[]>();
  for (const day of DAYS) {
    cursadasByDay.set(day, []);
  }
  for (const cursada of activeData) {
    for (const day of cursada.daysOfWeek) {
      if (DAYS.includes(day)) {
        cursadasByDay.get(day)!.push(cursada);
      }
    }
  }

  // Pre-compute layout per day and find the max height needed
  const layoutByDay = new Map<number, Map<string, number>>();
  let totalHeight = baseHeight;
  for (const day of DAYS) {
    const layout = computeVerticalLayout(cursadasByDay.get(day)!, gridStartMinutes);
    layoutByDay.set(day, layout);
    for (const cursada of cursadasByDay.get(day)!) {
      const top = layout.get(cursada.id)!;
      const bottom = top + cursada.durationMinutes * PIXELS_PER_MINUTE;
      if (bottom > totalHeight) totalHeight = bottom;
    }
  }

  return (
    <ScrollArea className="rounded-lg border">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="sticky top-0 z-10 grid grid-cols-[80px_repeat(6,1fr)] border-b bg-background">
          <div className="border-r p-2 text-center text-sm font-medium text-muted-foreground">
            Hora
          </div>
          {DAYS.map((day) => (
            <div
              key={day}
              className="border-r p-2 text-center text-sm font-medium last:border-r-0"
            >
              {getDayFullName(day)}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div className="grid grid-cols-[80px_repeat(6,1fr)]">
          {/* Time labels column */}
          <div className="relative border-r" style={{ height: totalHeight }}>
            {hours.map((hour) => {
              const top = (hour * 60 - gridStartMinutes) * PIXELS_PER_MINUTE;
              return (
                <div
                  key={hour}
                  className="absolute right-0 left-0 text-center text-xs text-muted-foreground"
                  style={{ top: top - 7 }}
                >
                  {hour.toString().padStart(2, "0")}:00
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {DAYS.map((day) => (
            <div
              key={day}
              className="relative border-r last:border-r-0"
              style={{ height: totalHeight }}
            >
              {/* Hour guide lines */}
              {hours.map((hour) => {
                const top = (hour * 60 - gridStartMinutes) * PIXELS_PER_MINUTE;
                return (
                  <div
                    key={hour}
                    className="absolute right-0 left-0 border-t border-dashed border-muted"
                    style={{ top }}
                  />
                );
              })}

              {/* Cursada blocks */}
              {cursadasByDay.get(day)!.map((cursada) => {
                const top = layoutByDay.get(day)!.get(cursada.id)!;
                const height = cursada.durationMinutes * PIXELS_PER_MINUTE;
                const endTime = addMinutesToTime(
                  cursada.startTime,
                  cursada.durationMinutes
                );

                return (
                  <CursadaDialog
                    key={`${cursada.id}-${day}`}
                    cursada={{
                      ...cursada,
                      docenteIds: cursada.cursadaDocentes.map(
                        (cd) => cd.docente.id
                      ),
                    }}
                    carreras={carreras}
                    asignaturas={asignaturas}
                    docentes={docentes}
                    aulas={aulas}
                  >
                    <div
                      className="absolute right-1 left-1 overflow-hidden rounded-md border p-1.5 text-xs cursor-pointer hover:brightness-95 transition-[filter]"
                      style={{
                        top,
                        height,
                        backgroundColor: `${cursada.carrera.color}20`,
                        borderColor: cursada.carrera.color,
                      }}
                    >
                      <div className="font-semibold leading-tight">
                        {cursada.asignatura.name}
                        {cursada.examen && (
                          <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">
                            Examen
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {formatTime(cursada.startTime)} - {endTime}
                      </div>
                      <div className="text-muted-foreground">
                        {cursada.aula.name}
                      </div>
                      <Badge
                        className="mt-0.5 text-white text-[10px] px-1 py-0"
                        style={{ backgroundColor: cursada.carrera.color }}
                      >
                        {cursada.carrera.name}
                      </Badge>
                      <Pencil className="absolute top-1.5 right-1.5 h-3 w-3 text-muted-foreground" />
                    </div>
                  </CursadaDialog>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
