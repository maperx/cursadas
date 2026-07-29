import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DOC_TIPO_LABELS,
  ESTADO_LABELS,
  MOTIVO_LABELS,
  SEDE_LABELS,
  type RegimenDocTipo,
  type RegimenEstado,
  type RegimenMotivo,
  type RegimenSede,
} from "@/lib/regimen-especial";

type SolicitudEstado = {
  estado: RegimenEstado;
  apellidos: string;
  nombres: string;
  dni: string;
  telefono: string;
  motivo: RegimenMotivo;
  sede: RegimenSede;
  carrera: { name: string; color: string };
  observaciones: string | null;
  observacionesRevision: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  asignaturas: {
    comisionActual: string | null;
    asignatura: { name: string };
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

export function RegimenEstado({ solicitud }: { solicitud: SolicitudEstado }) {
  return (
    <div className="space-y-6 rounded-lg border p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tu solicitud</h2>
          <p className="text-sm text-muted-foreground">
            Enviada el{" "}
            {format(new Date(solicitud.createdAt), "dd/MM/yyyy", { locale: es })}
          </p>
        </div>
        <Badge variant={ESTADO_VARIANT[solicitud.estado]}>
          {ESTADO_LABELS[solicitud.estado]}
        </Badge>
      </div>

      {solicitud.estado === "rechazada" && solicitud.observacionesRevision && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">
            Motivo del rechazo
          </p>
          <p className="whitespace-pre-line text-sm">
            {solicitud.observacionesRevision}
          </p>
        </div>
      )}

      {solicitud.estado === "aprobada" && solicitud.observacionesRevision && (
        <div className="rounded-md border bg-muted/40 p-3">
          <p className="text-sm font-medium">Observaciones</p>
          <p className="whitespace-pre-line text-sm">
            {solicitud.observacionesRevision}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Apellidos y nombres"
          value={`${solicitud.apellidos}, ${solicitud.nombres}`}
        />
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
                {a.asignatura.name}
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
            Observaciones (tuyas)
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
              <span className="font-medium">{DOC_TIPO_LABELS[doc.tipo]}</span>
              <span className="truncate text-muted-foreground">
                {doc.originalName}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
