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
  aprobarCambioComision,
  reabrirCambioComision,
  updateEstadoSolicitud,
} from "@/actions/regimen-especial";
import {
  CAMBIO_ESTADO_LABELS,
  DOC_TIPO_LABELS,
  ESTADO_LABELS,
  MOTIVO_LABELS,
  SEDE_LABELS,
  type RegimenCambioEstado,
  type RegimenDocTipo,
  type RegimenEstado,
  type RegimenMotivo,
  type RegimenSede,
} from "@/lib/regimen-especial";

export type Solicitud = {
  id: string;
  apellidos: string;
  nombres: string;
  dni: string;
  telefono: string;
  motivo: RegimenMotivo;
  sede: RegimenSede;
  estado: RegimenEstado;
  observaciones: string | null;
  observacionesRevision: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  cambioComisionEstado: RegimenCambioEstado;
  carrera: { name: string; color: string };
  user: { name: string; email: string };
  asignaturas: {
    name: string;
    comisionActual: string | null;
    comisionDeseada: string | null;
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
}: {
  children: React.ReactNode;
  solicitud: Solicitud;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nota, setNota] = useState(solicitud.observacionesRevision || "");
  const [loading, setLoading] = useState<"aprobada" | "rechazada" | null>(null);
  const [cambioLoading, setCambioLoading] = useState(false);

  const cambiosComision = solicitud.asignaturas.filter(
    (a) => a.comisionActual || a.comisionDeseada
  );

  const handleCambioComision = async (action: "aprobar" | "reabrir") => {
    setCambioLoading(true);
    try {
      const result =
        action === "aprobar"
          ? await aprobarCambioComision(solicitud.id)
          : await reabrirCambioComision(solicitud.id);
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title:
            action === "aprobar"
              ? "Cambio de comisión aprobado"
              : "Edición reabierta",
          description:
            action === "aprobar"
              ? "El estudiante ya no puede modificar las comisiones."
              : "El estudiante puede volver a editar las comisiones.",
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
      setCambioLoading(false);
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
            <Field label="Sede" value={SEDE_LABELS[solicitud.sede]} />
            <Field label="Carrera" value={solicitud.carrera.name} />
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Asignaturas</p>
            <div className="flex flex-wrap gap-2">
              {solicitud.asignaturas.length === 0 ? (
                <span className="text-sm text-muted-foreground">-</span>
              ) : (
                solicitud.asignaturas.map((a, i) => (
                  <Badge key={i} variant="outline">
                    {a.name}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Cambio de comisión</p>
                <Badge
                  variant={
                    solicitud.cambioComisionEstado === "aprobado"
                      ? "success"
                      : "warning"
                  }
                >
                  {CAMBIO_ESTADO_LABELS[solicitud.cambioComisionEstado]}
                </Badge>
              </div>

              {cambiosComision.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  El estudiante todavía no cargó cambios de comisión.
                </p>
              ) : (
                <div className="space-y-2">
                  {cambiosComision.map((a, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span className="font-medium">{a.name}:</span>
                      <span>{a.comisionActual || "—"}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span>{a.comisionDeseada || "—"}</span>
                    </div>
                  ))}
                </div>
              )}

              {solicitud.cambioComisionEstado === "pendiente" ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCambioComision("aprobar")}
                    disabled={cambioLoading || cambiosComision.length === 0}
                  >
                    {cambioLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-1" />
                        Aprobar cambio de comisión
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleCambioComision("reabrir")}
                    disabled={cambioLoading}
                  >
                    {cambioLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-1" />
                        Reabrir edición
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
