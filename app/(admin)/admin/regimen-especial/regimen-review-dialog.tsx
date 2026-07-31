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
import { ArrowRight, Check, FileText, Lock, Unlock, X } from "lucide-react";
import {
  aprobarCambioComisionAsignatura,
  reabrirCambioComisionAsignatura,
  updateEstadoSolicitud,
} from "@/actions/regimen-especial";
import {
  CAMBIO_ESTADO_LABELS,
  DOC_TIPO_LABELS,
  ESTADO_LABELS,
  MOTIVO_LABELS,
  esCambioComision,
  resumenCambiosComision,
  type RegimenCambioEstado,
  type RegimenDocTipo,
  type RegimenEstado,
  type RegimenMotivo,
} from "@/lib/regimen-especial";

export type Solicitud = {
  id: string;
  apellidos: string;
  nombres: string;
  dni: string;
  telefono: string;
  motivo: RegimenMotivo;
  sede: { name: string };
  estado: RegimenEstado;
  observaciones: string | null;
  observacionesRevision: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  carrera: { name: string; color: string };
  user: { name: string; email: string };
  asignaturas: {
    id: string;
    name: string;
    comisionActual: string | null;
    comisionDeseada: string | null;
    comisionEstado: RegimenCambioEstado;
  }[];
  documentos: { id: string; tipo: RegimenDocTipo; originalName: string }[];
};

const ESTADO_VARIANT: Record<
  RegimenEstado,
  "warning" | "success" | "destructive"
> = {
  pendiente: "warning",
  aprobada: "success",
  rechazada: "destructive",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function RegimenReviewDialog({
  children,
  solicitud,
  canResolverSolicitudes,
  canResolverCambios,
}: {
  children: React.ReactNode;
  solicitud: Solicitud;
  /** Puede aprobar/rechazar la solicitud. */
  canResolverSolicitudes: boolean;
  /** Puede aprobar/reabrir los cambios de comisión. */
  canResolverCambios: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nota, setNota] = useState(solicitud.observacionesRevision || "");
  const [loading, setLoading] = useState<"aprobada" | "rechazada" | null>(null);
  const [cambioLoadingId, setCambioLoadingId] = useState<string | null>(null);

  const cambiosComision = solicitud.asignaturas.filter(esCambioComision);
  const resumen = resumenCambiosComision(solicitud);

  const handleCambioComision = async (
    asignaturaId: string,
    action: "aprobar" | "reabrir"
  ) => {
    setCambioLoadingId(asignaturaId);
    try {
      const result =
        action === "aprobar"
          ? await aprobarCambioComisionAsignatura(asignaturaId)
          : await reabrirCambioComisionAsignatura(asignaturaId);
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        // Al aprobar el último cambio pendiente se notifica al estudiante.
        const emailEnviado = "emailEnviado" in result && result.emailEnviado;
        toast({
          title:
            action === "aprobar"
              ? "Cambio de comisión aprobado"
              : "Edición reabierta",
          description:
            action === "reabrir"
              ? "El estudiante puede volver a editar esta comisión."
              : emailEnviado
              ? "No quedan cambios pendientes: se notificó al estudiante por email."
              : "El estudiante ya no puede modificar esta comisión.",
          variant: "success",
        });
        router.refresh();
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar el cambio de comisión",
        variant: "destructive",
      });
    } finally {
      setCambioLoadingId(null);
    }
  };

  const handleDecision = async (estado: "aprobada" | "rechazada") => {
    if (estado === "rechazada" && !nota.trim()) {
      toast({
        title: "Falta el motivo",
        description: "Indicá el motivo del rechazo en las observaciones.",
        variant: "destructive",
      });
      return;
    }

    setLoading(estado);
    try {
      const result = await updateEstadoSolicitud(solicitud.id, estado, nota);
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: estado === "aprobada" ? "Solicitud aprobada" : "Solicitud rechazada",
          description: "Se notificó al estudiante por email.",
          variant: "success",
        });
        setOpen(false);
        router.refresh();
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar la solicitud",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Solicitud de régimen especial
            <Badge variant={ESTADO_VARIANT[solicitud.estado]}>
              {ESTADO_LABELS[solicitud.estado]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Apellidos y nombres"
              value={`${solicitud.apellidos}, ${solicitud.nombres}`}
            />
            <Field label="Email" value={solicitud.user.email} />
            <Field label="DNI" value={solicitud.dni} />
            <Field label="Teléfono" value={solicitud.telefono} />
            <Field label="Motivo" value={MOTIVO_LABELS[solicitud.motivo]} />
            <Field label="Sede" value={solicitud.sede.name} />
            <Field label="Carrera" value={solicitud.carrera.name} />
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              Asignaturas (con la comisión declarada)
            </p>
            <div className="flex flex-wrap gap-2">
              {solicitud.asignaturas.length === 0 ? (
                <span className="text-sm text-muted-foreground">-</span>
              ) : (
                solicitud.asignaturas.map((a, i) => (
                  <Badge key={i} variant="outline">
                    {a.name}
                    {a.comisionActual && (
                      <span className="ml-1 text-muted-foreground">
                        · Com. {a.comisionActual}
                      </span>
                    )}
                  </Badge>
                ))
              )}
            </div>
          </div>

          {solicitud.observaciones && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">
                Observaciones del estudiante
              </p>
              <p className="whitespace-pre-line text-sm">
                {solicitud.observaciones}
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Documentación</p>
            <div className="space-y-2">
              {solicitud.documentos.map((doc) => (
                <a
                  key={doc.id}
                  href={`/api/regimen/documentos/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">
                    {DOC_TIPO_LABELS[doc.tipo]}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {doc.originalName}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {solicitud.estado === "aprobada" && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">Cambio de comisión</p>
                {resumen.pedidos > 0 && (
                  <Badge
                    variant={resumen.pendientes > 0 ? "warning" : "success"}
                    className="tabular-nums"
                  >
                    {resumen.aprobados}/{resumen.pedidos} aprobados
                  </Badge>
                )}
              </div>

              {cambiosComision.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  El estudiante todavía no cargó cambios de comisión.
                </p>
              ) : (
                <div className="space-y-2">
                  {cambiosComision.map((a) => {
                    const aprobado = a.comisionEstado === "aprobado";
                    const loading = cambioLoadingId === a.id;
                    return (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <span className="font-medium">{a.name}:</span>
                        <span>{a.comisionActual || "—"}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span>{a.comisionDeseada || "—"}</span>
                        <Badge
                          variant={aprobado ? "success" : "warning"}
                          className="ml-1"
                        >
                          {CAMBIO_ESTADO_LABELS[a.comisionEstado]}
                        </Badge>
                        <div className="ml-auto">
                          {!canResolverCambios ? null : aprobado ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleCambioComision(a.id, "reabrir")
                              }
                              disabled={loading}
                            >
                              {loading ? (
                                <Spinner size="sm" />
                              ) : (
                                <>
                                  <Unlock className="h-4 w-4 mr-1" />
                                  Reabrir
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                handleCambioComision(a.id, "aprobar")
                              }
                              disabled={loading}
                            >
                              {loading ? (
                                <Spinner size="sm" />
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 mr-1" />
                                  Aprobar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {canResolverSolicitudes ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="nota">
                  Observaciones / motivo (obligatorio para rechazar)
                </Label>
                <Textarea
                  id="nota"
                  rows={3}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Se incluye en el email al estudiante..."
                  disabled={loading !== null}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDecision("rechazada")}
                  disabled={loading !== null}
                >
                  {loading === "rechazada" ? (
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
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => handleDecision("aprobada")}
                  disabled={loading !== null}
                >
                  {loading === "aprobada" ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Aprobar
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            solicitud.observacionesRevision && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Observaciones de la revisión
                </p>
                <p className="whitespace-pre-line text-sm">
                  {solicitud.observacionesRevision}
                </p>
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
