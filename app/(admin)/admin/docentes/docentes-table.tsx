"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { DocenteDialog } from "./docente-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { deleteDocente } from "@/actions/docentes";

type Docente = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

const columns: ColumnDef<Docente>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <DocenteDialog docente={row.original}>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </DocenteDialog>
        <DeleteDialog
          title="Eliminar Docente"
          description={`¿Estás seguro de que deseas eliminar al docente "${row.original.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => deleteDocente(row.original.id)}
        >
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </DeleteDialog>
      </div>
    ),
  },
];

interface DocentesTableProps {
  data: Docente[];
}

export function DocentesTable({ data }: DocentesTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumn="name"
      searchPlaceholder="Buscar docente..."
    />
  );
}
