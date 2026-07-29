"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { deleteSolicitudRegimen } from "@/actions/regimen-especial";
import {
  ESTADO_LABELS,
  MOTIVO_LABELS,
  REGIMEN_ESTADOS,
  type RegimenEstado,
} from "@/lib/regimen-especial";
import { RegimenReviewDialog, type Solicitud } from "./regimen-review-dialog";

const ESTADO_VARIANT: Record<
  RegimenEstado,
  "warning" | "success" | "destructive"
> = {
  pendiente: "warning",
  aprobada: "success",
  rechazada: "destructive",
};

const columns: ColumnDef<Solicitud>[] = [
  {
    id: "estudiante",
    accessorFn: (row) => `${row.apellidos}, ${row.nombres}`,
    header: "Estudiante",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">
          {row.original.apellidos}, {row.original.nombres}
        </div>
        <div className="text-xs text-muted-foreground">
          {row.original.user.email}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "dni",
    header: "DNI",
  },
  {
    id: "sede",
    accessorFn: (row) => row.sede.name,
    header: "Sede",
  },
  {
    id: "carrera",
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
    id: "motivo",
    header: "Motivo",
    cell: ({ row }) => MOTIVO_LABELS[row.original.motivo],
  },
  {
    id: "asignaturas",
    header: "Asig.",
    cell: ({ row }) => row.original.asignaturas.length,
  },
  {
    id: "estado",
    accessorFn: (row) => row.estado,
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={ESTADO_VARIANT[row.original.estado]}>
        {ESTADO_LABELS[row.original.estado]}
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
      <div className="flex items-center gap-2">
        <RegimenReviewDialog solicitud={row.original}>
          <Button variant="ghost" size="icon">
            <Eye className="h-4 w-4" />
          </Button>
        </RegimenReviewDialog>
        <DeleteDialog
          title="Eliminar solicitud"
          description={`¿Estás seguro de que deseas eliminar la solicitud de "${row.original.apellidos}, ${row.original.nombres}"? Esta acción no se puede deshacer.`}
          onConfirm={() => deleteSolicitudRegimen(row.original.id)}
        >
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </DeleteDialog>
      </div>
    ),
  },
];

interface RegimenTableProps {
  data: Solicitud[];
}

export function RegimenTable({ data }: RegimenTableProps) {
  // Las sedes del filtro salen de las solicitudes cargadas.
  const sedes = [...new Set(data.map((s) => s.sede.name))].sort();

  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumn="estudiante"
      searchPlaceholder="Buscar por estudiante..."
      filters={[
        {
          column: "estado",
          options: REGIMEN_ESTADOS.map((e) => ({
            label: ESTADO_LABELS[e],
            value: e,
          })),
          placeholder: "Todos los estados",
        },
        {
          column: "sede",
          options: sedes.map((name) => ({ label: name, value: name })),
          placeholder: "Todas las sedes",
        },
      ]}
    />
  );
}
