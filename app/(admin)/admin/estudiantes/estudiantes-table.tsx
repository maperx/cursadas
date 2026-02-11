"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { EstudianteDialog } from "./estudiante-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { deleteEstudiante } from "@/actions/estudiantes";

type Estudiante = {
  id: string;
  name: string;
  email: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const columns: ColumnDef<Estudiante>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    id: "vinculado",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={row.original.userId ? "success" : "secondary"}>
        {row.original.userId ? "Vinculado" : "Sin vincular"}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <EstudianteDialog estudiante={row.original}>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </EstudianteDialog>
        <DeleteDialog
          title="Eliminar Estudiante"
          description={`¿Estás seguro de que deseas eliminar al estudiante "${row.original.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => deleteEstudiante(row.original.id)}
        >
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </DeleteDialog>
      </div>
    ),
  },
];

interface EstudiantesTableProps {
  data: Estudiante[];
}

export function EstudiantesTable({ data }: EstudiantesTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumn="name"
      searchPlaceholder="Buscar estudiante..."
    />
  );
}
