"use client";

import { useMemo, useState } from "react";
import { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { deleteSolicitudRegimen } from "@/actions/regimen-especial";
import {
  CAMBIOS_FILTROS,
  CAMBIOS_FILTRO_LABELS,
  ESTADO_LABELS,
  MOTIVO_LABELS,
  REGIMEN_ESTADOS,
  cambiosFiltro,
  resumenCambiosComision,
  type CambiosFiltro,
  type RegimenEstado,
} from "@/lib/regimen-especial";
import { CambiosProgreso, type ProgresoCambios } from "./cambios-progreso";
import { RegimenReviewDialog, type Solicitud } from "./regimen-review-dialog";

const ESTADO_VARIANT: Record<
  RegimenEstado,
  "warning" | "success" | "destructive"
> = {
  pendiente: "warning",
  aprobada: "success",
  rechazada: "destructive",
};

type RegimenPerms = {
  canDelete: boolean;
  canResolverSolicitudes: boolean;
  canResolverCambios: boolean;
};

function buildColumns(perms: RegimenPerms): ColumnDef<Solicitud>[] {
  return [
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
      id: "cambios",
      // El valor accesorio es la categoría del filtro; la celda muestra el
      // avance (aprobados sobre pedidos).
      accessorFn: (row) => cambiosFiltro(resumenCambiosComision(row)),
      filterFn: "equalsString",
      header: "Cambios com.",
      cell: ({ row }) => {
        const resumen = resumenCambiosComision(row.original);
        if (resumen.pedidos === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        const hayPendientes = resumen.pendientes > 0;
        return (
          <Badge
            variant={hayPendientes ? "warning" : "success"}
            className="gap-1"
            title={`${resumen.aprobados} de ${resumen.pedidos} cambios aprobados · ${resumen.pendientes} pendiente(s) de aprobación`}
          >
            {hayPendientes ? (
              <Clock className="h-3 w-3" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            <span className="tabular-nums">
              {resumen.aprobados}/{resumen.pedidos}
            </span>
          </Badge>
        );
      },
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
          <RegimenReviewDialog
            solicitud={row.original}
            canResolverSolicitudes={perms.canResolverSolicitudes}
            canResolverCambios={perms.canResolverCambios}
          >
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </RegimenReviewDialog>
          {perms.canDelete && (
            <DeleteDialog
              title="Eliminar solicitud"
              description={`¿Estás seguro de que deseas eliminar la solicitud de "${row.original.apellidos}, ${row.original.nombres}"? Esta acción no se puede deshacer.`}
              onConfirm={() => deleteSolicitudRegimen(row.original.id)}
            >
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </DeleteDialog>
          )}
        </div>
      ),
    },
  ];
}

interface RegimenTableProps extends RegimenPerms {
  data: Solicitud[];
}

export function RegimenTable({
  data,
  canDelete,
  canResolverSolicitudes,
  canResolverCambios,
}: RegimenTableProps) {
  // Las sedes del filtro salen de las solicitudes cargadas.
  const sedes = [...new Set(data.map((s) => s.sede.name))].sort();

  const columns = useMemo(
    () =>
      buildColumns({
        canDelete,
        canResolverSolicitudes,
        canResolverCambios,
      }),
    [canDelete, canResolverSolicitudes, canResolverCambios]
  );

  // Los filtros se manejan acá (y no dentro de DataTable) para que el resumen
  // de progreso pueda aplicar el filtro de cambios con un click.
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const filtroCambios = columnFilters.find((f) => f.id === "cambios")?.value as
    | CambiosFiltro
    | undefined;

  const setFiltroCambios = (value: CambiosFiltro | undefined) => {
    setColumnFilters((prev) => {
      const otros = prev.filter((f) => f.id !== "cambios");
      return value ? [...otros, { id: "cambios", value }] : otros;
    });
  };

  // El Excel lo arma la ruta del servidor, así que los filtros de estado y sede
  // de la tabla viajan como query params.
  const filtroEstado = columnFilters.find((f) => f.id === "estado")?.value as
    | RegimenEstado
    | undefined;
  const filtroSede = columnFilters.find((f) => f.id === "sede")?.value as
    | string
    | undefined;

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (filtroEstado) params.set("estado", filtroEstado);
    if (filtroSede) params.set("sede", filtroSede);
    const query = params.toString();
    return `/api/regimen/cambios-comision${query ? `?${query}` : ""}`;
  }, [filtroEstado, filtroSede]);

  // Cuántos cambios entrarían en el Excel con los filtros puestos: si no hay
  // ninguno, el botón se deshabilita en vez de bajar una planilla vacía.
  const cambiosExportables = useMemo(
    () =>
      data.reduce((total, solicitud) => {
        if (filtroEstado && solicitud.estado !== filtroEstado) return total;
        if (filtroSede && solicitud.sede.name !== filtroSede) return total;
        return total + resumenCambiosComision(solicitud).pedidos;
      }, 0),
    [data, filtroEstado, filtroSede]
  );

  const progreso = useMemo<ProgresoCambios>(() => {
    let pedidos = 0;
    let aprobados = 0;
    let solicitudesPendientes = 0;
    let solicitudesAprobadas = 0;
    for (const solicitud of data) {
      const resumen = resumenCambiosComision(solicitud);
      if (resumen.pedidos === 0) continue;
      pedidos += resumen.pedidos;
      aprobados += resumen.aprobados;
      if (resumen.pendientes > 0) solicitudesPendientes++;
      else solicitudesAprobadas++;
    }
    return {
      pedidos,
      aprobados,
      pendientes: pedidos - aprobados,
      solicitudesPendientes,
      solicitudesAprobadas,
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <CambiosProgreso
        progreso={progreso}
        filtro={filtroCambios}
        onFiltroChange={setFiltroCambios}
      />

      <div className="flex justify-end">
        {cambiosExportables > 0 ? (
          <Button variant="outline" asChild className="w-fit">
            <a href={exportHref} download>
              <FileSpreadsheet className="h-4 w-4" />
              Exportar cambios a Excel ({cambiosExportables})
            </a>
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled
            className="w-fit"
            title="No hay cambios de comisión para exportar con los filtros aplicados"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar cambios a Excel
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchColumn="estudiante"
        searchPlaceholder="Buscar por estudiante..."
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
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
            column: "cambios",
            options: CAMBIOS_FILTROS.map((c) => ({
              label: CAMBIOS_FILTRO_LABELS[c],
              value: c,
            })),
            placeholder: "Todos los cambios",
          },
          {
            column: "sede",
            options: sedes.map((name) => ({ label: name, value: name })),
            placeholder: "Todas las sedes",
          },
        ]}
      />
    </div>
  );
}
