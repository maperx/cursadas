"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { CursadaDialog } from "./cursada-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { deleteCursada } from "@/actions/cursadas";
import { getDayName, formatTime, addMinutesToTime } from "@/lib/utils";
import { useMemo } from "react";

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
  carreras: Carrera[];
  asignaturas: Asignatura[];
  docentes: Docente[];
  aulas: Aula[];
}

export function CursadasTable({
  data,
  carreras,
  asignaturas,
  docentes,
  aulas,
}: CursadasTableProps) {
  const activeCursadas = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return data.filter((c) => {
      if (c.asignatura.startDate && today < c.asignatura.startDate) return false;
      if (c.asignatura.endDate && today > c.asignatura.endDate) return false;
      return true;
    });
  }, [data]);

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
    <DataTable
      columns={columns}
      data={activeCursadas}
      searchColumn="asignatura"
      searchPlaceholder="Buscar cursada..."
    />
  );
}
