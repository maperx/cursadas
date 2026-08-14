"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import { ArrowRight, Check, Unlock, X } from "lucide-react";
import {
  reabrirCambioComisionAsignatura,
  resolverCambioComisionAsignatura,
} from "@/actions/regimen-especial";
import {
  CAMBIO_ESTADO_LABELS,
  cambioResuelto,
  esCambioComision,
  resumenCambiosComision,
  type RegimenCambioEstado,
  type RegimenCambioResolucion,
} from "@/lib/regimen-especial";
import type { Solicitud } from "./regimen-review-dialog";

const CAMBIO_VARIANT: Record<
  RegimenCambioEstado,
  "warning" | "success" | "destructive"
> = {
  pendiente: "warning",
  aprobado: "success",
  rechazado: "destructive",
};

/** Acción en curso: qué asignatura y qué se está haciendo con ella. */
type Pendiente = {
  asignaturaId: string;
  accion: RegimenCambioResolucion | "reabrir";
};

/**
 * Diálogo dedicado a resolver los cambios de comisión. Va aparte de la revisión
 * de la solicitud porque lo usa un usuario distinto: el permiso
 * `regimen.resolverCambios` no implica `regimen.resolverSolicitudes`.
 */
export function CambiosComisionDialog({
  children,
  solicitud,
  canResolverCambios,
}: {
  children: React.ReactNode;
  solicitud: Solicitud;
  /** Sin el permiso el diálogo queda de solo lectura. */
  canResolverCambios: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  // Observación por cambio, tal como se va editando en el diálogo.
  const [notas, setNotas] = useState<Record<string, string>>({});

  const cambios = solicitud.asignaturas.filter(esCambioComision);
  const resumen = resumenCambiosComision(solicitud);

  // Al abrir el diálogo se parte de lo último guardado, no de lo que quedó
  // tipeado la vez anterior.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setNotas(
        Object.fromEntries(
          solicitud.asignaturas.map((a) => [a.id, a.comisionObservaciones ?? ""])
        )
      );
    }
    setOpen(next);
  };

  const handleResolver = async (
    asignaturaId: string,
    estado: RegimenCambioResolucion
  ) => {
    const nota = notas[asignaturaId] ?? "";
    if (estado === "rechazado" && !nota.trim()) {
      toast({
        title: "Falta el motivo",
        description: "Indicá en la observación por qué se rechaza el cambio.",
        variant: "destructive",
      });
      return;
    }

    setPendiente({ asignaturaId, accion: estado });
    try {
      const result = await resolverCambioComisionAsignatura(
        asignaturaId,
        estado,
        nota
      );
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      // Al resolver el último cambio pendiente se notifica al estudiante.
      const emailEnviado = "emailEnviado" in result && result.emailEnviado;
      toast({
        title:
          estado === "aprobado"
            ? "Cambio de comisión aprobado"
            : "Cambio de comisión rechazado",
        description: emailEnviado
          ? "No quedan cambios pendientes: se notificó al estudiante por email."
          : "El estudiante ya no puede modificar esta comisión.",
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo resolver el cambio de comisión",
        variant: "destructive",
      });
    } finally {
      setPendiente(null);
    }
  };

  const handleReabrir = async (asignaturaId: string) => {
    setPendiente({ asignaturaId, accion: "reabrir" });
    try {
      const result = await reabrirCambioComisionAsignatura(asignaturaId);
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Edición reabierta",
        description: "El estudiante puede volver a editar esta comisión.",
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo reabrir el cambio de comisión",
        variant: "destructive",
      });
    } finally {
      setPendiente(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            Cambios de comisión
            {resumen.pedidos > 0 && (
              <Badge
                variant={resumen.pendientes > 0 ? "warning" : "success"}
                className="tabular-nums"
              >
                {resumen.pedidos - resumen.pendientes}/{resumen.pedidos}{" "}
                resueltos
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">
              {solicitud.apellidos}, {solicitud.nombres}
            </p>
            <p className="text-xs text-muted-foreground">
              DNI {solicitud.dni} · {solicitud.carrera.name} ·{" "}
              {solicitud.sede.name}
            </p>
          </div>

          {cambios.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              El estudiante todavía no cargó cambios de comisión.
            </p>
          ) : (
            <div className="space-y-3">
              {cambios.map((a) => {
                const resuelto = cambioResuelto(a.comisionEstado);
                const enCurso = pendiente?.asignaturaId === a.id;
                return (
                  <div key={a.id} className="space-y-3 rounded-md border p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{a.name}</span>
                      <span className="ml-auto flex items-center gap-2">
                        <span>{a.comisionActual || "—"}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span>{a.comisionDeseada || "—"}</span>
                      </span>
                      <Badge variant={CAMBIO_VARIANT[a.comisionEstado]}>
                        {CAMBIO_ESTADO_LABELS[a.comisionEstado]}
                      </Badge>
                    </div>

                    {resuelto ? (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Observación
                        </p>
                        <p className="whitespace-pre-line text-sm">
                          {a.comisionObservaciones || "—"}
                        </p>
                      </div>
                    ) : (
                      canResolverCambios && (
                        <div className="space-y-2">
                          <Label htmlFor={`obs-${a.id}`}>
                            Observación (obligatoria para rechazar)
                          </Label>
                          <Textarea
                            id={`obs-${a.id}`}
                            rows={2}
                            value={notas[a.id] ?? ""}
                            onChange={(e) =>
                              setNotas((prev) => ({
                                ...prev,
                                [a.id]: e.target.value,
                              }))
                            }
                            placeholder="La ve el estudiante junto con el resultado..."
                            disabled={pendiente !== null}
                          />
                        </div>
                      )
                    )}

                    {canResolverCambios && (
                      <div className="flex flex-wrap justify-end gap-2">
                        {resuelto ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleReabrir(a.id)}
                            disabled={pendiente !== null}
                          >
                            {enCurso ? (
                              <Spinner size="sm" />
                            ) : (
                              <>
                                <Unlock className="h-4 w-4 mr-1" />
                                Reabrir
                              </>
                            )}
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleResolver(a.id, "rechazado")}
                              disabled={pendiente !== null}
                            >
                              {enCurso && pendiente?.accion === "rechazado" ? (
                                <Spinner size="sm" />
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Rechazar
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700"
                              onClick={() => handleResolver(a.id, "aprobado")}
                              disabled={pendiente !== null}
                            >
                              {enCurso && pendiente?.accion === "aprobado" ? (
                                <Spinner size="sm" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Aprobar
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
