"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { AulaDialog } from "./aula-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { deleteAula } from "@/actions/aulas";

type Sede = {
  id: string;
  name: string;
};

type Aula = {
  id: string;
  name: string;
  building: string;
  capacity: number | null;
  sedeId: string;
  sede: Sede;
  createdAt: Date;
  updatedAt: Date;
};

interface AulasTableProps {
  data: Aula[];
  sedes: Sede[];
  canEdit: boolean;
  canDelete: boolean;
}

export function AulasTable({
  data,
  sedes,
  canEdit,
  canDelete,
}: AulasTableProps) {
  const buildings = [...new Set(data.map((a) => a.building))].sort();

  const columns: ColumnDef<Aula>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
    },
    {
      id: "sede",
      accessorFn: (row) => row.sede.name,
      header: "Sede",
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
    ...(canEdit || canDelete
      ? [
          {
            id: "actions",
            cell: ({ row }) => (
              <div className="flex items-center gap-2">
                {canEdit && (
                  <AulaDialog aula={row.original} sedes={sedes}>
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </AulaDialog>
                )}
                {canDelete && (
                  <DeleteDialog
                    title="Eliminar Aula"
                    description={`¿Estás seguro de que deseas eliminar el aula "${row.original.name}"? Esta acción no se puede deshacer.`}
                    onConfirm={() => deleteAula(row.original.id)}
                  >
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </DeleteDialog>
                )}
              </div>
            ),
          } satisfies ColumnDef<Aula>,
        ]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumn="name"
      searchPlaceholder="Buscar aula..."
      filters={[
        {
          column: "sede",
          options: sedes.map((s) => ({ label: s.name, value: s.name })),
          placeholder: "Todas las sedes",
        },
        {
          column: "building",
          options: buildings.map((b) => ({ label: b, value: b })),
          placeholder: "Todos los edificios",
        },
      ]}
    />
  );
}
