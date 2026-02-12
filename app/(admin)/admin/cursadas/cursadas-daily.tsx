"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDayFullName, formatTime, addMinutesToTime } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { CursadaDialog } from "./cursada-dialog";

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

interface CursadasDailyProps {
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

type LayoutInfo = { colIndex: number; totalCols: number };

function computeOverlapLayout(cursadas: Cursada[]): Map<string, LayoutInfo> {
  const result = new Map<string, LayoutInfo>();
  if (cursadas.length === 0) return result;

  const sorted = [...cursadas].sort((a, b) => {
    const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (diff !== 0) return diff;
    return b.durationMinutes - a.durationMinutes;
  });

  const groups: Cursada[][] = [];
  for (const cursada of sorted) {
    const start = timeToMinutes(cursada.startTime);
    let placed = false;
    for (const group of groups) {
      const groupEnd = Math.max(
        ...group.map((c) => timeToMinutes(c.startTime) + c.durationMinutes)
      );
      if (start < groupEnd) {
        group.push(cursada);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([cursada]);
    }
  }

  for (const group of groups) {
    const columns: { end: number }[] = [];
    for (const cursada of group) {
      const start = timeToMinutes(cursada.startTime);
      let colIndex = columns.findIndex((col) => col.end <= start);
      if (colIndex === -1) {
        colIndex = columns.length;
        columns.push({ end: 0 });
      }
      columns[colIndex].end = start + cursada.durationMinutes;
      result.set(cursada.id, { colIndex, totalCols: 0 });
    }
    const totalCols = columns.length;
    for (const cursada of group) {
      result.get(cursada.id)!.totalCols = totalCols;
    }
  }

  return result;
}

function formatDateLabel(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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

export function CursadasDaily({
  data,
  selectedDate,
  onDateChange,
  carreras,
  asignaturas,
  docentes,
  aulas,
}: CursadasDailyProps) {
  // JS getDay(): 0=Sunday, 1=Monday... matches our daysOfWeek convention
  const dayOfWeek = selectedDate.getDay();
  const selectedDateStr = toInputValue(selectedDate); // "YYYY-MM-DD"
  const dayCursadas = data.filter((c) => {
    if (!c.daysOfWeek.includes(dayOfWeek)) return false;
    // If asignatura has date range, only show cursada within that range
    const { startDate, endDate } = c.asignatura;
    if (startDate && selectedDateStr < startDate) return false;
    if (endDate && selectedDateStr > endDate) return false;
    return true;
  });

  // Date navigation
  const goToPrev = () => onDateChange(addDays(selectedDate, -1));
  const goToNext = () => onDateChange(addDays(selectedDate, 1));
  const goToToday = () => onDateChange(new Date());

  const isToday =
    toInputValue(selectedDate) === toInputValue(new Date());

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

  const layout = computeOverlapLayout(dayCursadas);
  const totalHeight = baseHeight;

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
        <div>
          {/* Header */}
          <div className="sticky top-0 z-10 grid grid-cols-[80px_1fr] border-b bg-background">
            <div className="border-r p-2 text-center text-sm font-medium text-muted-foreground">
              Hora
            </div>
            <div className="p-2 text-center text-sm font-medium">
              {getDayFullName(dayOfWeek)} — {formatDateLabel(selectedDate)}
            </div>
          </div>

          {/* Grid body */}
          <div className="grid grid-cols-[80px_1fr]">
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

            {/* Day column */}
            <div className="relative" style={{ height: totalHeight }}>
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
              {dayCursadas.map((cursada) => {
                const startMins = timeToMinutes(cursada.startTime);
                const top = (startMins - gridStartMinutes) * PIXELS_PER_MINUTE;
                const height = cursada.durationMinutes * PIXELS_PER_MINUTE;
                const endTime = addMinutesToTime(
                  cursada.startTime,
                  cursada.durationMinutes
                );
                const { colIndex, totalCols } = layout.get(cursada.id)!;
                const widthPercent = 100 / totalCols;
                const leftPercent = colIndex * widthPercent;

                return (
                  <CursadaDialog
                    key={cursada.id}
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
                      className="absolute overflow-hidden rounded-md border p-2 text-sm cursor-pointer hover:brightness-95 transition-[filter]"
                      style={{
                        top,
                        height,
                        left: `calc(${leftPercent}% + 4px)`,
                        width: `calc(${widthPercent}% - 8px)`,
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
                      {cursada.cursadaDocentes.length > 0 && (
                        <div className="text-muted-foreground">
                          {cursada.cursadaDocentes
                            .map((cd) => cd.docente.name)
                            .join(", ")}
                        </div>
                      )}
                      <Badge
                        className="mt-0.5 text-white text-[10px] px-1 py-0"
                        style={{ backgroundColor: cursada.carrera.color }}
                      >
                        {cursada.carrera.name}
                      </Badge>
                      <Pencil className="absolute top-2 right-2 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </CursadaDialog>
                );
              })}
            </div>
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
        {getDayFullName(dayOfWeek)}
        {isToday && " (hoy)"}
      </span>
    </div>
  );
}
