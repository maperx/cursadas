"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { AulaDialog } from "./aula-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { deleteAula } from "@/actions/aulas";

type Aula = {
  id: string;
  name: string;
  building: string;
  capacity: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const columns: ColumnDef<Aula>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "building",
    header: "Edificio",
  },
  {
    accessorKey: "capacity",
    header: "Capacidad",
    cell: ({ row }) =>
      row.original.capacity ? `${row.original.capacity} personas` : "-",
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <AulaDialog aula={row.original}>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </AulaDialog>
        <DeleteDialog
          title="Eliminar Aula"
          description={`¿Estás seguro de que deseas eliminar el aula "${row.original.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => deleteAula(row.original.id)}
        >
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </DeleteDialog>
      </div>
    ),
  },
];

interface AulasTableProps {
  data: Aula[];
}

export function AulasTable({ data }: AulasTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumn="name"
      searchPlaceholder="Buscar aula..."
    />
  );
}
