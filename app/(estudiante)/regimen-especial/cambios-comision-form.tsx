"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, Lock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { updateCambiosComision } from "@/actions/regimen-especial";
import {
  CAMBIO_ESTADO_LABELS,
  esCambioComision,
  soloNumeros,
  type RegimenCambioEstado,
} from "@/lib/regimen-especial";

type AsignaturaCambio = {
  asignaturaId: string;
  nombre: string;
  comisionActual: string | null;
  comisionDeseada: string | null;
  estado: RegimenCambioEstado;
};

interface CambiosComisionFormProps {
  solicitudId: string;
  asignaturas: AsignaturaCambio[];
}

export function CambiosComisionForm({
  solicitudId,
  asignaturas,
}: CambiosComisionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<AsignaturaCambio[]>(asignaturas);

  const hayEditables = rows.some((r) => r.estado === "pendiente");

  // Asignaturas cuya comisión actual quedó fijada al enviar la solicitud.
  const comisionFija = useMemo(
    () =>
      new Set(
        asignaturas.filter((a) => a.comisionActual).map((a) => a.asignaturaId)
      ),
    [asignaturas]
  );

  const setValue = (
    asignaturaId: string,
    field: "comisionActual" | "comisionDeseada",
    value: string
  ) =>
    setRows((prev) =>
      prev.map((r) =>
        r.asignaturaId === asignaturaId
          ? { ...r, [field]: soloNumeros(value) }
          : r
      )
    );

  const handleSave = async () => {
    setIsLoading(true);
    const result = await updateCambiosComision({
      solicitudId,
      // Se envían solo las asignaturas editables; las aprobadas no se tocan.
      cambios: rows
        .filter((r) => r.estado === "pendiente")
        .map((r) => ({
          asignaturaId: r.asignaturaId,
          comisionActual: r.comisionActual,
          comisionDeseada: r.comisionDeseada,
        })),
    });
    setIsLoading(false);

    if (result.error) {
      toast({
        title: "No se pudo guardar",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Cambios guardados",
      description:
        "Quedaron registrados. Un administrador debe aprobar cada cambio para confirmarlo.",
      variant: "success",
    });
    router.refresh();
  };

  return (
    <div className="space-y-4 rounded-lg border p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Cambio de comisión</h2>
        <p className="text-sm text-muted-foreground">
          La comisión actual es la que declaraste al enviar la solicitud.
          Indicá, si corresponde, a qué comisión te querés cambiar en cada
          asignatura. Cada cambio lo aprueba un administrador por separado; una
          vez aprobado no se puede modificar.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const bloqueada = row.estado === "aprobado";
          // Sin comisión deseada no hay nada que aprobar: no se muestra estado.
          const pidioCambio = esCambioComision(row);
          return (
            <div
              key={row.asignaturaId}
              className="space-y-3 rounded-md border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{row.nombre}</p>
                {(bloqueada || pidioCambio) && (
                  <Badge variant={bloqueada ? "success" : "warning"}>
                    {bloqueada && <Lock className="mr-1 h-3 w-3" />}
                    {CAMBIO_ESTADO_LABELS[row.estado]}
                  </Badge>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Comisión actual
                  </p>
                  {/* Viene de la solicitud y no se edita. Las solicitudes
                      anteriores a ese campo la tienen vacía: ahí sí se carga. */}
                  {comisionFija.has(row.asignaturaId) ? (
                    <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                      {row.comisionActual}
                    </div>
                  ) : (
                    <Input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={row.comisionActual ?? ""}
                      onChange={(e) =>
                        setValue(
                          row.asignaturaId,
                          "comisionActual",
                          e.target.value
                        )
                      }
                      placeholder="Ej: 1"
                      disabled={bloqueada || isLoading}
                    />
                  )}
                </div>

                <div className="hidden items-end justify-center pb-2 text-muted-foreground sm:flex">
                  <ArrowRight className="h-4 w-4" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Cambiar a</p>
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={row.comisionDeseada ?? ""}
                    onChange={(e) =>
                      setValue(
                        row.asignaturaId,
                        "comisionDeseada",
                        e.target.value
                      )
                    }
                    placeholder="Ej: 3"
                    disabled={bloqueada || isLoading}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hayEditables && (
        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : "Guardar cambios"}
          </Button>
        </div>
      )}
    </div>
  );
}
