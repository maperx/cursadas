"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { CarreraDialog } from "./carrera-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { deleteCarrera } from "@/actions/carreras";

type Carrera = {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
};

const columns: ColumnDef<Carrera>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "color",
    header: "Color",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div
          className="h-5 w-5 rounded border"
          style={{ backgroundColor: row.original.color }}
        />
        <span className="text-sm text-muted-foreground">
          {row.original.color}
        </span>
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <CarreraDialog carrera={row.original}>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </CarreraDialog>
        <DeleteDialog
          title="Eliminar Carrera"
          description={`¿Estás seguro de que deseas eliminar la carrera "${row.original.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => deleteCarrera(row.original.id)}
        >
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </DeleteDialog>
      </div>
    ),
  },
];

interface CarrerasTableProps {
  data: Carrera[];
}

export function CarrerasTable({ data }: CarrerasTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumn="name"
      searchPlaceholder="Buscar carrera..."
    />
  );
}
