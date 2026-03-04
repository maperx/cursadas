"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDayFullName, formatTime, addMinutesToTime } from "@/lib/utils";
import { CursadaDialog } from "./cursada-dialog";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";

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
  eventDate: string | null;
  commissionNumber: string | null;
  examen: boolean;
  createdAt: Date;
  updatedAt: Date;
  aula: Aula;
  carrera: Carrera;
  asignatura: { id: string; name: string; startDate: string | null; endDate: string | null };
  cursadaDocentes: {
    user: { id: string; name: string; email: string };
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

interface CursadasAulasProps {
  data: Cursada[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  carreras: Carrera[];
  asignaturas: Asignatura[];
  docentes: Docente[];
  aulas: Aula[];
}

const PIXELS_PER_MINUTE = 1.5;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateLabel(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Push overlapping blocks down so they stack vertically within an aula column. */
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

  const placedBottoms: { top: number; bottom: number }[] = [];
  const GAP = 2;

  for (const cursada of sorted) {
    const naturalTop =
      (timeToMinutes(cursada.startTime) - gridStartMinutes) * PIXELS_PER_MINUTE;
    const height = cursada.durationMinutes * PIXELS_PER_MINUTE;

    let top = naturalTop;
    let hasConflict = true;
    while (hasConflict) {
      hasConflict = false;
      for (const placed of placedBottoms) {
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

export function CursadasAulas({
  data,
  selectedDate,
  onDateChange,
  carreras,
  asignaturas,
  docentes,
  aulas,
}: CursadasAulasProps) {
  const dayOfWeek = selectedDate.getDay();
  const selectedDateStr = toInputValue(selectedDate);

  // Filter cursadas for the selected day
  const dayCursadas = useMemo(() => {
    return data.filter((c) => {
      if (c.weeklyRepetition) {
        if (!c.daysOfWeek.includes(dayOfWeek)) return false;
        const { startDate, endDate } = c.asignatura;
        if (startDate && selectedDateStr < startDate) return false;
        if (endDate && selectedDateStr > endDate) return false;
        return true;
      }
      return c.eventDate === selectedDateStr;
    });
  }, [data, dayOfWeek, selectedDateStr]);

  // Only show aulas that have cursadas for this day
  const activeAulas = useMemo(() => {
    const aulaIds = new Set(dayCursadas.map((c) => c.aulaId));
    return aulas.filter((a) => aulaIds.has(a.id));
  }, [dayCursadas, aulas]);

  // Navigation
  const goToPrev = () => onDateChange(addDays(selectedDate, -1));
  const goToNext = () => onDateChange(addDays(selectedDate, 1));
  const goToToday = () => onDateChange(new Date());
  const isToday = toInputValue(selectedDate) === toInputValue(new Date());

  if (dayCursadas.length === 0) {
    return (
      <div>
        <DateNav
          selectedDate={selectedDate}
          dayOfWeek={dayOfWeek}
          isToday={isToday}
          onPrev={goToPrev}
          onNext={goToNext}
          onToday={goToToday}
          onDateChange={onDateChange}
        />
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-muted-foreground">
            No hay cursadas para el {getDayFullName(dayOfWeek).toLowerCase()}
          </p>
        </div>
      </div>
    );
  }

  // Calculate grid time range
  let minHour = 24;
  let maxHour = 0;
  for (const cursada of dayCursadas) {
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

  // Group cursadas by aula
  const cursadasByAula = new Map<string, Cursada[]>();
  for (const aula of activeAulas) {
    cursadasByAula.set(aula.id, []);
  }
  for (const cursada of dayCursadas) {
    cursadasByAula.get(cursada.aulaId)?.push(cursada);
  }

  // Pre-compute layout per aula and find the max height needed
  const layoutByAula = new Map<string, Map<string, number>>();
  let totalHeight = baseHeight;
  for (const aula of activeAulas) {
    const layout = computeVerticalLayout(cursadasByAula.get(aula.id)!, gridStartMinutes);
    layoutByAula.set(aula.id, layout);
    for (const cursada of cursadasByAula.get(aula.id)!) {
      const top = layout.get(cursada.id)!;
      const bottom = top + cursada.durationMinutes * PIXELS_PER_MINUTE;
      if (bottom > totalHeight) totalHeight = bottom;
    }
  }

  const colCount = activeAulas.length;

  return (
    <div>
      <DateNav
        selectedDate={selectedDate}
        dayOfWeek={dayOfWeek}
        isToday={isToday}
        onPrev={goToPrev}
        onNext={goToNext}
        onToday={goToToday}
        onDateChange={onDateChange}
      />
      <ScrollArea className="rounded-lg border">
        <div className="min-w-[800px]">
          {/* Header */}
          <div
            className="sticky top-0 z-10 border-b bg-background"
            style={{ display: "grid", gridTemplateColumns: `80px repeat(${colCount}, 1fr)` }}
          >
            <div className="border-r p-2 text-center text-sm font-medium text-muted-foreground">
              Hora
            </div>
            {activeAulas.map((aula, i) => (
              <div
                key={aula.id}
                className={`p-2 text-center text-sm font-medium ${i < colCount - 1 ? "border-r" : ""}`}
              >
                <div>{aula.name}</div>
                <div className="text-xs text-muted-foreground">{aula.building}</div>
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div
            style={{ display: "grid", gridTemplateColumns: `80px repeat(${colCount}, 1fr)` }}
          >
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

            {/* Aula columns */}
            {activeAulas.map((aula, i) => (
              <div
                key={aula.id}
                className={`relative ${i < colCount - 1 ? "border-r" : ""}`}
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
                {cursadasByAula.get(aula.id)!.map((cursada) => {
                  const top = layoutByAula.get(aula.id)!.get(cursada.id)!;
                  const height = cursada.durationMinutes * PIXELS_PER_MINUTE;
                  const endTime = addMinutesToTime(
                    cursada.startTime,
                    cursada.durationMinutes
                  );

                  return (
                    <CursadaDialog
                      key={cursada.id}
                      cursada={{
                        ...cursada,
                        docenteIds: cursada.cursadaDocentes.map(
                          (cd) => cd.user.id
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
                        {cursada.commissionNumber && (
                          <div className="text-muted-foreground">
                            Comisión {cursada.commissionNumber}
                          </div>
                        )}
                        <div className="text-muted-foreground">
                          {formatTime(cursada.startTime)} - {endTime}
                        </div>
                        {cursada.cursadaDocentes.length > 0 && (
                          <div className="text-muted-foreground truncate">
                            {cursada.cursadaDocentes
                              .map((cd) => cd.user.name)
                              .join(", ")}
                          </div>
                        )}
                        {cursada.notes && (
                          <div className="text-muted-foreground italic truncate">
                            {cursada.notes}
                          </div>
                        )}
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
    </div>
  );
}

function DateNav({
  selectedDate,
  dayOfWeek,
  isToday,
  onPrev,
  onNext,
  onToday,
  onDateChange,
}: {
  selectedDate: Date;
  dayOfWeek: number;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateChange: (date: Date) => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={onPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={onNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isToday && (
        <Button variant="outline" size="sm" onClick={onToday}>
          Hoy
        </Button>
      )}
      <input
        type="date"
        value={toInputValue(selectedDate)}
        onChange={(e) => {
          if (e.target.value) {
            const [y, m, d] = e.target.value.split("-").map(Number);
            onDateChange(new Date(y, m - 1, d));
          }
        }}
        className="rounded-md border bg-background px-3 py-1.5 text-sm"
      />
      <span className="text-sm text-muted-foreground">
        {getDayFullName(dayOfWeek)} — {formatDateLabel(selectedDate)}
        {isToday && " (hoy)"}
      </span>
    </div>
  );
}
