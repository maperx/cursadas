"use client";

import { CheckCircle2, Clock, X, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CambiosFiltro } from "@/lib/regimen-especial";

export type ProgresoCambios = {
  /** Cambios pedidos por los estudiantes (resueltos + pendientes). */
  pedidos: number;
  aprobados: number;
  rechazados: number;
  pendientes: number;
  /** Solicitudes que tienen al menos un cambio pendiente de resolución. */
  solicitudesPendientes: number;
  /** Solicitudes con todos sus cambios ya resueltos. */
  solicitudesResueltas: number;
};

// Chip clickeable que aplica (o limpia) uno de los filtros de la tabla.
function FiltroChip({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted/60",
        active && "border-current bg-muted/60",
        className
      )}
    >
      {children}
      {active && <X className="h-3 w-3" />}
    </button>
  );
}

export function CambiosProgreso({
  progreso,
  filtro,
  onFiltroChange,
}: {
  progreso: ProgresoCambios;
  filtro: CambiosFiltro | undefined;
  onFiltroChange: (filtro: CambiosFiltro | undefined) => void;
}) {
  const { pedidos, aprobados, rechazados, pendientes } = progreso;

  // Sin cambios cargados no hay progreso que mostrar.
  if (pedidos === 0) return null;

  const resueltos = aprobados + rechazados;
  const pct = Math.round((resueltos / pedidos) * 100);
  // El chip activo se vuelve a clickear para limpiar el filtro.
  const toggle = (value: CambiosFiltro) =>
    onFiltroChange(filtro === value ? undefined : value);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-medium">Cambios de comisión</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">
              {resueltos}
            </span>{" "}
            de <span className="tabular-nums">{pedidos}</span> resueltos (
            <span className="tabular-nums">{pct}%</span>)
          </p>
        </div>

        {/* Dos tramos: lo aprobado y lo rechazado, sobre el total pedido. */}
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Cambios de comisión resueltos"
        >
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(aprobados / pedidos) * 100}%` }}
          />
          <div
            className="h-full bg-destructive transition-all"
            style={{ width: `${(rechazados / pedidos) * 100}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FiltroChip
            active={filtro === "pendientes"}
            onClick={() => toggle("pendientes")}
            className={cn(
              pendientes > 0 && "text-yellow-600 dark:text-yellow-500"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="tabular-nums">{pendientes}</span> pendiente
            {pendientes === 1 ? "" : "s"}
            <span className="text-muted-foreground">
              · {progreso.solicitudesPendientes} solicitud
              {progreso.solicitudesPendientes === 1 ? "" : "es"}
            </span>
          </FiltroChip>

          <FiltroChip
            active={filtro === "aprobados"}
            onClick={() => toggle("aprobados")}
            className="text-green-600 dark:text-green-500"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="tabular-nums">{aprobados}</span> aprobado
            {aprobados === 1 ? "" : "s"}
            <span className="text-muted-foreground">
              · {progreso.solicitudesResueltas} solicitud
              {progreso.solicitudesResueltas === 1 ? "" : "es"} al día
            </span>
          </FiltroChip>

          {rechazados > 0 && (
            <FiltroChip
              active={filtro === "rechazados"}
              onClick={() => toggle("rechazados")}
              className="text-destructive"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span className="tabular-nums">{rechazados}</span> rechazado
              {rechazados === 1 ? "" : "s"}
            </FiltroChip>
          )}

          {filtro && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 text-xs"
              onClick={() => onFiltroChange(undefined)}
            >
              Ver todas
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
