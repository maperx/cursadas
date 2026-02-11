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
  commissionNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  aula: Aula;
  carrera: Carrera;
  asignatura: { id: string; name: string };
  cursadaDocentes: {
    docente: Docente;
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
  const columns: ColumnDef<Cursada>[] = [
    {
      id: "asignatura",
      accessorFn: (row) => row.asignatura.name,
      header: "Asignatura",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.asignatura.name}</div>
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
      header: "Días",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.daysOfWeek.map((day) => (
            <Badge key={day} variant="outline">
              {getDayName(day)}
            </Badge>
          ))}
        </div>
      ),
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
          .map((cd) => cd.docente.name)
          .join(", ");
        return (
          <div className="max-w-[150px] truncate" title={docenteNames}>
            {docenteNames || "-"}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <CursadaDialog
            cursada={{
              ...row.original,
              docenteIds: row.original.cursadaDocentes.map(
                (cd) => cd.docente.id
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
      data={data}
      searchColumn="asignatura"
      searchPlaceholder="Buscar cursada..."
      filterColumn="carrera"
      filterOptions={carreras.map((c) => ({ label: c.name, value: c.name }))}
      filterPlaceholder="Todas las carreras"
    />
  );
}
