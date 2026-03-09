"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { AsignaturaDialog } from "./asignatura-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { deleteAsignatura } from "@/actions/asignaturas";

type Carrera = {
  id: string;
  name: string;
  color: string;
};

type Docente = {
  id: string;
  name: string;
  email: string;
};

type Asignatura = {
  id: string;
  name: string;
  carreraId: string;
  startDate: string | null;
  endDate: string | null;
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
  carrera: Carrera;
  asignaturaDocentes: {
    user: Docente;
  }[];
};

interface AsignaturasTableProps {
  data: Asignatura[];
  carreras: Carrera[];
  docentes: Docente[];
}

export function AsignaturasTable({ data, carreras, docentes }: AsignaturasTableProps) {
  const columns: ColumnDef<Asignatura>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
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
      id: "docentes",
      header: "Docentes",
      cell: ({ row }) => {
        const docenteNames = row.original.asignaturaDocentes
          .map((ad) => ad.user.name)
          .join(", ");
        return docenteNames || "-";
      },
    },
    {
      id: "fechas",
      header: "Fechas",
      cell: ({ row }) => {
        if (!row.original.startDate && !row.original.endDate) return "-";
        const start = row.original.startDate
          ? row.original.startDate.split("-").reverse().join("/")
          : "";
        const end = row.original.endDate
          ? row.original.endDate.split("-").reverse().join("/")
          : "";
        return `${start} - ${end}`;
      },
    },
    {
      accessorKey: "visible",
      header: "Visible",
      cell: ({ row }) => (
        row.original.visible
          ? <Eye className="h-4 w-4 text-muted-foreground" />
          : <EyeOff className="h-4 w-4 text-muted-foreground" />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <AsignaturaDialog
            asignatura={{
              ...row.original,
              docenteIds: row.original.asignaturaDocentes.map((ad) => ad.user.id),
            }}
            carreras={carreras}
            docentes={docentes}
          >
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </AsignaturaDialog>
          <DeleteDialog
            title="Eliminar Asignatura"
            description={`¿Estás seguro de que deseas eliminar la asignatura "${row.original.name}"? Esta acción no se puede deshacer.`}
            onConfirm={() => deleteAsignatura(row.original.id)}
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
      searchColumn="name"
      searchPlaceholder="Buscar asignatura..."
      filters={[
        {
          column: "carrera",
          options: carreras.map((c) => ({ label: c.name, value: c.name })),
          placeholder: "Todas las carreras",
        },
      ]}
    />
  );
}
