"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDayFullName, formatTime, addMinutesToTime } from "@/lib/utils";
import { CursadaDialog } from "./cursada-dialog";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { deleteCursada } from "@/actions/cursadas";

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

interface CursadasWeeklyProps {
  data: Cursada[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
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

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, n: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + n);
  return result;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatShortDate(date: Date): string {
  const d = date.getDate();
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${d} ${months[date.getMonth()]}`;
}

function toInputValue(date: Date): string {
  return toDateStr(date);
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

export function CursadasWeekly({
  data,
  selectedDate,
  onDateChange,
  carreras,
  asignaturas,
  docentes,
  aulas,
}: CursadasWeeklyProps) {
  const weekMonday = getMonday(selectedDate);
  const weekSaturday = addDays(weekMonday, 5);
  const weekMondayStr = toDateStr(weekMonday);
  const weekSaturdayStr = toDateStr(weekSaturday);

  const activeData = useMemo(() => {
    return data.filter((c) => {
      if (c.weeklyRepetition) {
        // Weekly recurring: show if the week overlaps the asignatura date range
        const { startDate, endDate } = c.asignatura;
        if (startDate && weekSaturdayStr < startDate) return false;
        if (endDate && weekMondayStr > endDate) return false;
        return true;
      }
      // One-time event: show if eventDate falls within this week
      if (!c.eventDate) return false;
      return c.eventDate >= weekMondayStr && c.eventDate <= weekSaturdayStr;
    });
  }, [data, weekMondayStr, weekSaturdayStr]);

  // Date for each day column (Mon=0 offset through Sat=5 offset)
  const dayDates = DAYS.map((_, i) => addDays(weekMonday, i));

  // Navigation
  const goToPrevWeek = () => onDateChange(addDays(selectedDate, -7));
  const goToNextWeek = () => onDateChange(addDays(selectedDate, 7));
  const goToToday = () => onDateChange(new Date());

  const todayMonday = getMonday(new Date());
  const isCurrentWeek = toDateStr(weekMonday) === toDateStr(todayMonday);

  // Week range label
  const weekLabel =
    weekMonday.getFullYear() === weekSaturday.getFullYear()
      ? `${formatShortDate(weekMonday)} - ${formatShortDate(weekSaturday)} ${weekSaturday.getFullYear()}`
      : `${formatShortDate(weekMonday)} ${weekMonday.getFullYear()} - ${formatShortDate(weekSaturday)} ${weekSaturday.getFullYear()}`;

  if (activeData.length === 0) {
    return (
      <div>
        <WeekNav
          selectedDate={selectedDate}
          weekLabel={weekLabel}
          isCurrentWeek={isCurrentWeek}
          onPrevWeek={goToPrevWeek}
          onNextWeek={goToNextWeek}
          onToday={goToToday}
          onDateChange={onDateChange}
        />
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-muted-foreground">No hay cursadas para esta semana</p>
        </div>
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
    if (cursada.weeklyRepetition) {
      // Weekly recurring: group by daysOfWeek
      for (const day of cursada.daysOfWeek) {
        if (DAYS.includes(day)) {
          cursadasByDay.get(day)!.push(cursada);
        }
      }
    } else if (cursada.eventDate) {
      // One-time event: compute day column from eventDate
      const [y, m, d] = cursada.eventDate.split("-").map(Number);
      const eventDay = new Date(y, m - 1, d).getDay(); // 0=Sun, 1=Mon...
      if (DAYS.includes(eventDay)) {
        cursadasByDay.get(eventDay)!.push(cursada);
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
    <div>
      <WeekNav
        selectedDate={selectedDate}
        weekLabel={weekLabel}
        isCurrentWeek={isCurrentWeek}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
        onDateChange={onDateChange}
      />
      <ScrollArea className="rounded-lg border">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="sticky top-0 z-10 grid grid-cols-[80px_repeat(6,1fr)] border-b bg-background">
            <div className="border-r p-2 text-center text-sm font-medium text-muted-foreground">
              Hora
            </div>
            {DAYS.map((day, i) => {
              const date = dayDates[i];
              const dd = date.getDate().toString().padStart(2, "0");
              const mm = (date.getMonth() + 1).toString().padStart(2, "0");
              return (
                <div
                  key={day}
                  className="border-r p-2 text-center text-sm font-medium last:border-r-0"
                >
                  {getDayFullName(day)} {dd}/{mm}
                </div>
              );
            })}
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
                              Evento
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
                        <div className="text-muted-foreground">
                          {cursada.aula.name}
                        </div>
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
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                          <DeleteDialog
                            title="Eliminar Cursada"
                            description={`¿Estás seguro de que deseas eliminar esta cursada de "${cursada.asignatura.name}"? Esta acción no se puede deshacer.`}
                            onConfirm={() => deleteCursada(cursada.id)}
                          >
                            <button onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </DeleteDialog>
                        </div>
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

function WeekNav({
  selectedDate,
  weekLabel,
  isCurrentWeek,
  onPrevWeek,
  onNextWeek,
  onToday,
  onDateChange,
}: {
  selectedDate: Date;
  weekLabel: string;
  isCurrentWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onDateChange: (date: Date) => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={onPrevWeek}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={onNextWeek}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isCurrentWeek && (
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
        {weekLabel}
        {isCurrentWeek && " (esta semana)"}
      </span>
    </div>
  );
}
