"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { CursadaDialog } from "./cursada-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { deleteCursada } from "@/actions/cursadas";
import { getDayName, getDayFullName, formatTime, addMinutesToTime } from "@/lib/utils";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Carrera = {
  id: string;
  name: string;
  color: string;
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
    user: Docente;
  }[];
};

interface CursadasTableProps {
  data: Cursada[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  carreras: Carrera[];
  asignaturas: Asignatura[];
  docentes: Docente[];
  aulas: Aula[];
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

export function CursadasTable({
  data,
  selectedDate,
  onDateChange,
  carreras,
  asignaturas,
  docentes,
  aulas,
}: CursadasTableProps) {
  const selectedDateStr = toInputValue(selectedDate);
  const dayOfWeek = selectedDate.getDay();
  const activeCursadas = useMemo(() => {
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
  }, [data, selectedDateStr, dayOfWeek]);
  const isToday = selectedDateStr === toInputValue(new Date());
  const goToPrev = () => onDateChange(addDays(selectedDate, -1));
  const goToNext = () => onDateChange(addDays(selectedDate, 1));
  const goToToday = () => onDateChange(new Date());

  const columns: ColumnDef<Cursada>[] = [
    {
      id: "asignatura",
      accessorFn: (row) => row.asignatura.name,
      header: "Asignatura",
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{row.original.asignatura.name}</span>
            {row.original.examen && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                Examen
              </Badge>
            )}
          </div>
          {row.original.commissionNumber && (
            <div className="text-xs text-muted-foreground">
              Comisión {row.original.commissionNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "carrera",
      accessorFn: (row) => row.carrera.name,
      header: "Carrera",
      cell: ({ row }) => (
        <Badge
          style={{ backgroundColor: row.original.carrera.color }}
          className="text-white"
        >
          {row.original.carrera.name}
        </Badge>
      ),
    },
    {
      id: "aula",
      accessorFn: (row) => row.aula.name,
      header: "Aula",
      cell: ({ row }) => (
        <div>
          <div>{row.original.aula.name}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.aula.building}
          </div>
        </div>
      ),
    },
    {
      id: "dias",
      header: "Días / Fecha",
      cell: ({ row }) => {
        if (!row.original.weeklyRepetition && row.original.eventDate) {
          const [y, m, d] = row.original.eventDate.split("-");
          return (
            <Badge variant="secondary">
              {d}/{m}/{y}
            </Badge>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {row.original.daysOfWeek.map((day) => (
              <Badge key={day} variant="outline">
                {getDayName(day)}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "horario",
      header: "Horario",
      cell: ({ row }) => {
        const endTime = addMinutesToTime(
          row.original.startTime,
          row.original.durationMinutes
        );
        return (
          <div>
            {formatTime(row.original.startTime)} - {endTime}
          </div>
        );
      },
    },
    {
      id: "docentes",
      header: "Docentes",
      cell: ({ row }) => {
        const docenteNames = row.original.cursadaDocentes
          .map((cd) => cd.user.name)
          .join(", ");
        return (
          <div className="max-w-[150px] truncate" title={docenteNames}>
            {docenteNames || "-"}
          </div>
        );
      },
    },
    {
      id: "notas",
      accessorFn: (row) => row.notes,
      header: "Notas",
      cell: ({ row }) =>
        row.original.notes ? (
          <div className="max-w-[200px] truncate" title={row.original.notes}>
            {row.original.notes}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <CursadaDialog
            cursada={{
              ...row.original,
              docenteIds: row.original.cursadaDocentes.map(
                (cd) => cd.user.id
              ),
            }}
            carreras={carreras}
            asignaturas={asignaturas}
            docentes={docentes}
            aulas={aulas}
          >
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </CursadaDialog>
          <DeleteDialog
            title="Eliminar Cursada"
            description={`¿Estás seguro de que deseas eliminar esta cursada de "${row.original.asignatura.name}"? Esta acción no se puede deshacer.`}
            onConfirm={() => deleteCursada(row.original.id)}
          >
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </DeleteDialog>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={goToPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={goToNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isToday && (
          <Button variant="outline" size="sm" onClick={goToToday}>
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
      <DataTable
        columns={columns}
        data={activeCursadas}
        searchColumn="asignatura"
        searchPlaceholder="Buscar cursada..."
      />
    </div>
  );
}
