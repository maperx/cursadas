"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { deleteInscripcion } from "@/actions/inscripciones";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Inscripcion = {
  id: string;
  userId: string;
  cursadaId: string;
  status: "activa" | "baja";
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  cursada: {
    id: string;
    asignatura: {
      id: string;
      name: string;
    };
    carrera: {
      id: string;
      name: string;
      color: string;
    };
    aula: {
      id: string;
      name: string;
      building: string;
    };
  };
};

const columns: ColumnDef<Inscripcion>[] = [
  {
    id: "estudiante",
    header: "Estudiante",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.user.name}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.user.email}
        </div>
      </div>
    ),
  },
  {
    id: "cursada",
    header: "Cursada",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.cursada.asignatura.name}</div>
        <Badge
          style={{ backgroundColor: row.original.cursada.carrera.color }}
          className="text-white text-xs"
        >
          {row.original.cursada.carrera.name}
        </Badge>
      </div>
    ),
  },
  {
    id: "aula",
    header: "Aula",
    cell: ({ row }) => (
      <div>
        <div>{row.original.cursada.aula.name}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.cursada.aula.building}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "activa" ? "success" : "secondary"}>
        {row.original.status === "activa" ? "Activa" : "Baja"}
      </Badge>
    ),
  },
  {
    id: "fecha",
    header: "Fecha",
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "dd/MM/yyyy", { locale: es }),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DeleteDialog
        title="Eliminar Inscripción"
        description={`¿Estás seguro de que deseas eliminar la inscripción de "${row.original.user.name}" en "${row.original.cursada.asignatura.name}"?`}
        onConfirm={() => deleteInscripcion(row.original.id)}
      >
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DeleteDialog>
    ),
  },
];

interface InscripcionesTableProps {
  data: Inscripcion[];
}

export function InscripcionesTable({ data }: InscripcionesTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumn="estudiante"
      searchPlaceholder="Buscar por estudiante..."
    />
  );
}
