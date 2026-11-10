"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDayFullName, formatTime, addMinutesToTime } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  cursadasDelDia,
  getMonday,
  toDateStr,
} from "@/lib/cursadas-schedule";

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
  aula: { id: string; name: string; building: string };
  carrera: { id: string; name: string; color: string };
  asignatura: {
    id: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    recesos: { startDate: string; endDate: string }[];
  };
  cursadaDocentes: {
    user: { id: string; name: string };
  }[];
  suspensiones: { date: string; observacion: string | null }[];
};

interface PublicWeeklyViewProps {
  cursadas: Cursada[];
}

const PIXELS_PER_MINUTE = 1.5;
// Lunes a Domingo; el domingo solo se muestra si esa semana hay algo.
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatShortDate(date: Date): string {
  const d = date.getDate();
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  return `${d} ${months[date.getMonth()]}`;
}

function toInputValue(date: Date): string {
  return toDateStr(date);
}

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

export function PublicWeeklyView({ cursadas }: PublicWeeklyViewProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const weekMonday = getMonday(selectedDate);

  // Cursadas de cada día de la semana, resueltas sobre la fecha concreta:
  // período de la asignatura, recesos y eventos que desplazan cursadas.
  const cursadasByDay = (() => {
    const monday = weekMonday;
    const map = new Map<number, { date: string; cursadas: Cursada[] }>();
    ALL_DAYS.forEach((day, i) => {
      const date = toDateStr(addDays(monday, i));
      map.set(day, {
        date,
        cursadas: cursadasDelDia(cursadas, date, { prioridadEventos: true }),
      });
    });
    return map;
  })();

  const DAYS = ALL_DAYS.filter(
    (day) => day !== 0 || cursadasByDay.get(0)!.cursadas.length > 0
  );
  const activeData = DAYS.flatMap((day) => cursadasByDay.get(day)!.cursadas);
  const dayDates = DAYS.map((_, i) => addDays(weekMonday, i));
  const weekEnd = dayDates[dayDates.length - 1];

  const goToPrevWeek = () => setSelectedDate(addDays(selectedDate, -7));
  const goToNextWeek = () => setSelectedDate(addDays(selectedDate, 7));
  const goToToday = () => setSelectedDate(new Date());

  const todayMonday = getMonday(new Date());
  const isCurrentWeek = toDateStr(weekMonday) === toDateStr(todayMonday);

  const weekLabel =
    weekMonday.getFullYear() === weekEnd.getFullYear()
      ? `${formatShortDate(weekMonday)} - ${formatShortDate(weekEnd)} ${weekEnd.getFullYear()}`
      : `${formatShortDate(weekMonday)} ${weekMonday.getFullYear()} - ${formatShortDate(weekEnd)} ${weekEnd.getFullYear()}`;

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
          onDateChange={setSelectedDate}
        />
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-muted-foreground">
            No hay cursadas para esta semana
          </p>
        </div>
      </div>
    );
  }

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

  const dateByDay = new Map<number, string>();
  for (const day of DAYS) dateByDay.set(day, cursadasByDay.get(day)!.date);

  const layoutByDay = new Map<number, Map<string, number>>();
  let totalHeight = baseHeight;
  for (const day of DAYS) {
    const layout = computeVerticalLayout(
      cursadasByDay.get(day)!.cursadas,
      gridStartMinutes
    );
    layoutByDay.set(day, layout);
    for (const cursada of cursadasByDay.get(day)!.cursadas) {
      const top = layout.get(cursada.id)!;
      const bottom = top + cursada.durationMinutes * PIXELS_PER_MINUTE;
      if (bottom > totalHeight) totalHeight = bottom;
    }
  }

  const gridTemplateColumns = `80px repeat(${DAYS.length}, 1fr)`;

  return (
    <div>
      <WeekNav
        selectedDate={selectedDate}
        weekLabel={weekLabel}
        isCurrentWeek={isCurrentWeek}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
        onDateChange={setSelectedDate}
      />
      <ScrollArea className="rounded-lg border">
        <div className="min-w-[800px]">
          {/* Header */}
          <div
            className="sticky top-0 z-10 grid border-b bg-background"
            style={{ gridTemplateColumns }}
          >
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
          <div className="grid" style={{ gridTemplateColumns }}>
            {/* Time labels column */}
            <div className="relative border-r" style={{ height: totalHeight }}>
              {hours.map((hour) => {
                const top =
                  (hour * 60 - gridStartMinutes) * PIXELS_PER_MINUTE;
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
                {hours.map((hour) => {
                  const top =
                    (hour * 60 - gridStartMinutes) * PIXELS_PER_MINUTE;
                  return (
                    <div
                      key={hour}
                      className="absolute right-0 left-0 border-t border-dashed border-muted"
                      style={{ top }}
                    />
                  );
                })}

                {cursadasByDay.get(day)!.cursadas.map((cursada) => {
                  const top = layoutByDay.get(day)!.get(cursada.id)!;
                  const height = cursada.durationMinutes * PIXELS_PER_MINUTE;
                  const endTime = addMinutesToTime(
                    cursada.startTime,
                    cursada.durationMinutes
                  );
                  const occurrenceDate = dateByDay.get(day)!;
                  const suspension = cursada.suspensiones.find(
                    (s) => s.date === occurrenceDate
                  );
                  const isSuspended = !!suspension;

                  return (
                    <div
                      key={`${cursada.id}-${day}`}
                      className={`absolute right-1 left-1 overflow-hidden rounded-md border p-1.5 text-xs ${isSuspended ? "opacity-60" : ""}`}
                      style={{
                        top,
                        height,
                        backgroundColor: `${cursada.carrera.color}20`,
                        borderColor: cursada.carrera.color,
                      }}
                    >
                      <div className={`font-semibold leading-tight ${isSuspended ? "line-through" : ""}`}>
                        {cursada.asignatura.name}
                        {cursada.examen && (
                          <Badge
                            variant="destructive"
                            className="ml-1 text-[10px] px-1 py-0"
                          >
                            Evento/Examen
                          </Badge>
                        )}
                      </div>
                      {isSuspended && (
                        <Badge
                          variant="destructive"
                          className="my-0.5 text-[10px] px-1 py-0"
                        >
                          Suspendida
                        </Badge>
                      )}
                      <div className="text-muted-foreground">
                        {formatTime(cursada.startTime)} - {endTime}
                      </div>
                      <div className="text-muted-foreground">
                        {cursada.aula.name}
                      </div>
                      {cursada.commissionNumber && (
                        <div className="text-muted-foreground">
                          Com. {cursada.commissionNumber}
                        </div>
                      )}
                      {isSuspended && suspension?.observacion && (
                        <div className="text-destructive italic truncate">
                          {suspension.observacion}
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
                    </div>
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
    <div className="mb-4 flex flex-wrap items-center gap-2">
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
