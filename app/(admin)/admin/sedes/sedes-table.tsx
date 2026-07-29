"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { SedeDialog } from "./sede-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { deleteSede } from "@/actions/sedes";

type Carrera = {
  id: string;
  name: string;
  color: string;
};

type Sede = {
  id: string;
  name: string;
  address: string | null;
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
  carreras: Carrera[];
  aulasCount: number;
};

interface SedesTableProps {
  data: Sede[];
  carreras: Carrera[];
}

export function SedesTable({ data, carreras }: SedesTableProps) {
  const columns: ColumnDef<Sede>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
    },
    {
      accessorKey: "address",
      header: "Dirección",
      cell: ({ row }) =>
        row.original.address || (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: "carreras",
      header: "Carreras",
      cell: ({ row }) =>
        row.original.carreras.length === 0 ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.original.carreras.map((carrera) => (
              <Badge
                key={carrera.id}
                style={{ backgroundColor: carrera.color }}
                className="text-white"
              >
                {carrera.name}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      id: "aulas",
      header: "Aulas",
      cell: ({ row }) => row.original.aulasCount,
    },
    {
      accessorKey: "visible",
      header: "Visible",
      cell: ({ row }) =>
        row.original.visible ? (
          <Eye className="h-4 w-4 text-muted-foreground" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <SedeDialog sede={row.original} carreras={carreras}>
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </SedeDialog>
          <DeleteDialog
            title="Eliminar Sede"
            description={`¿Estás seguro de que deseas eliminar la sede "${row.original.name}"? Esta acción no se puede deshacer.`}
            onConfirm={() => deleteSede(row.original.id)}
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
      searchPlaceholder="Buscar sede..."
    />
  );
}
