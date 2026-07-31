import { readFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { regimenEmailPlantillas } from "./db/schema";
import { sendEmail, type EmailAttachment } from "./email";
import {
  MOTIVO_LABELS,
  REGIMEN_EMAIL_DEFAULTS,
  esCambioComision,
  renderPlantilla,
  type RegimenEmailTipo,
  type RegimenMotivo,
} from "./regimen-especial";

// El adjunto puede ser una resolución o un instructivo interno: se guarda fuera
// de public/ y se sirve por una ruta autenticada, igual que la documentación.
export const REGIMEN_EMAIL_UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads/regimen-email"
);

export type RegimenEmailPlantilla = {
  tipo: RegimenEmailTipo;
  asunto: string;
  cuerpo: string;
  activo: boolean;
  adjunto: {
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
  } | null;
  updatedAt: Date | null;
  /** false mientras rige el texto por defecto (nunca se guardó la plantilla). */
  configurada: boolean;
};

const PLANTILLA_POR_DEFECTO = (
  tipo: RegimenEmailTipo
): RegimenEmailPlantilla => ({
  tipo,
  ...REGIMEN_EMAIL_DEFAULTS[tipo],
  activo: true,
  adjunto: null,
  updatedAt: null,
  configurada: false,
});

type PlantillaRow = typeof regimenEmailPlantillas.$inferSelect;

function toPlantilla(row: PlantillaRow): RegimenEmailPlantilla {
  return {
    tipo: row.tipo,
    asunto: row.asunto,
    cuerpo: row.cuerpo,
    activo: row.activo,
    adjunto: row.adjuntoFileName
      ? {
          fileName: row.adjuntoFileName,
          originalName: row.adjuntoOriginalName ?? row.adjuntoFileName,
          mimeType: row.adjuntoMimeType ?? "application/pdf",
          size: row.adjuntoSize ?? 0,
        }
      : null,
    updatedAt: row.updatedAt,
    configurada: true,
  };
}

/** Plantilla guardada o, si todavía no se configuró, la de por defecto. */
export async function getPlantilla(
  tipo: RegimenEmailTipo
): Promise<RegimenEmailPlantilla> {
  const row = await db.query.regimenEmailPlantillas.findFirst({
    where: eq(regimenEmailPlantillas.tipo, tipo),
  });
  return row ? toPlantilla(row) : PLANTILLA_POR_DEFECTO(tipo);
}

export async function getPlantillas(
  tipos: readonly RegimenEmailTipo[]
): Promise<RegimenEmailPlantilla[]> {
  const rows = await db.query.regimenEmailPlantillas.findMany();
  const byTipo = new Map(rows.map((r) => [r.tipo, toPlantilla(r)]));
  return tipos.map((tipo) => byTipo.get(tipo) ?? PLANTILLA_POR_DEFECTO(tipo));
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type SolicitudParaEmail = {
  apellidos: string;
  nombres: string;
  dni: string;
  motivo: RegimenMotivo;
  observacionesRevision: string | null;
  carrera: { name: string };
  sede: { name: string };
  asignaturas: {
    comisionActual: string | null;
    comisionDeseada: string | null;
    asignatura: { name: string };
  }[];
};

/**
 * Valores de los `{{marcadores}}`. El asunto es texto plano y el cuerpo es
 * HTML, así que se arman los dos juegos: en `html` todo lo que viene de la base
 * va escapado y las enumeraciones se sirven como lista.
 */
export type RegimenEmailVars = {
  html: Record<string, string>;
  texto: Record<string, string>;
};

export function varsDeSolicitud(solicitud: SolicitudParaEmail): RegimenEmailVars {
  const asignaturas = solicitud.asignaturas.map(
    (a) =>
      `${a.asignatura.name}${
        a.comisionActual ? ` (comisión ${a.comisionActual})` : ""
      }`
  );

  const cambios = solicitud.asignaturas
    .filter(esCambioComision)
    .map(
      (a) =>
        `${a.asignatura.name}: comisión ${a.comisionActual || "—"} → ${
          a.comisionDeseada || "—"
        }`
    );

  const texto: Record<string, string> = {
    nombre: `${solicitud.apellidos}, ${solicitud.nombres}`,
    apellidos: solicitud.apellidos,
    nombres: solicitud.nombres,
    dni: solicitud.dni,
    carrera: solicitud.carrera.name,
    sede: solicitud.sede.name,
    motivo: MOTIVO_LABELS[solicitud.motivo],
    asignaturas: asignaturas.join(", "),
    observaciones: solicitud.observacionesRevision ?? "",
    cambios: cambios.join(", "),
  };

  const lista = (items: string[]) =>
    items.length === 0
      ? ""
      : `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;

  const html: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(texto).map(([k, v]) => [k, escapeHtml(v)])
    ),
    asignaturas: lista(asignaturas),
    cambios: lista(cambios),
    observaciones: escapeHtml(texto.observaciones).replace(/\n/g, "<br/>"),
  };

  return { html, texto };
}

/** Cuerpo final del email: el HTML del editor dentro de un contenedor legible. */
export function envolverCuerpo(html: string): string {
  return `<div style="font-family: sans-serif; font-size: 15px; line-height: 1.5; color: #111; max-width: 600px; margin: 0 auto;">${html}</div>`;
}

async function leerAdjunto(
  plantilla: RegimenEmailPlantilla
): Promise<EmailAttachment[] | undefined> {
  if (!plantilla.adjunto) return undefined;
  try {
    const content = await readFile(
      path.join(REGIMEN_EMAIL_UPLOAD_DIR, plantilla.adjunto.fileName)
    );
    return [
      {
        filename: plantilla.adjunto.originalName,
        content,
        contentType: plantilla.adjunto.mimeType,
      },
    ];
  } catch (error) {
    // Si el archivo no está, se envía el email igual: es peor no avisar.
    console.error("No se pudo leer el adjunto de la plantilla:", error);
    return undefined;
  }
}

/**
 * Envía el email configurado para `tipo`. Devuelve false si la plantilla está
 * desactivada (no es un error: el admin eligió no notificar).
 */
export async function enviarEmailRegimen({
  tipo,
  to,
  vars,
}: {
  tipo: RegimenEmailTipo;
  to: string;
  vars: RegimenEmailVars;
}): Promise<boolean> {
  const plantilla = await getPlantilla(tipo);
  if (!plantilla.activo) return false;

  await sendEmail({
    to,
    subject: renderPlantilla(plantilla.asunto, vars.texto),
    html: envolverCuerpo(renderPlantilla(plantilla.cuerpo, vars.html)),
    attachments: await leerAdjunto(plantilla),
  });
  return true;
}
