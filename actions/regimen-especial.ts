"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  regimenAsignaturas,
  regimenDocumentos,
  regimenSolicitudes,
  user,
} from "@/lib/db/schema";
import { requireAdmin, requireAuth } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email";
import {
  DOC_GENERALES,
  DOC_LABORALES,
  DOC_PERSONAS,
  DOC_TIPO_LABELS,
  ESTADO_LABELS,
  MOTIVO_LABELS,
  REGIMEN_DOC_TIPOS,
  REGIMEN_MOTIVOS,
  REGIMEN_SEDES,
  motivoIncluyeLaboral,
  motivoIncluyePersonas,
  type RegimenDocTipo,
} from "@/lib/regimen-especial";

const documentoInputSchema = z.object({
  tipo: z.enum(REGIMEN_DOC_TIPOS),
  fileName: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
});

const solicitudSchema = z.object({
  apellidos: z.string().min(1, "Los apellidos son requeridos"),
  nombres: z.string().min(1, "Los nombres son requeridos"),
  dni: z.string().min(1, "El DNI es requerido"),
  telefono: z.string().min(1, "El teléfono es requerido"),
  motivo: z.enum(REGIMEN_MOTIVOS),
  sede: z.enum(REGIMEN_SEDES),
  carreraId: z.string().uuid("Carrera inválida"),
  observaciones: z.string().optional().nullable(),
  asignaturaIds: z
    .array(z.string().uuid())
    .min(1, "Seleccione al menos una asignatura"),
  documentos: z.array(documentoInputSchema).default([]),
});

export async function getMiSolicitudRegimen() {
  const session = await requireAuth();
  return await db.query.regimenSolicitudes.findFirst({
    where: eq(regimenSolicitudes.userId, session.user.id),
    orderBy: (s, { desc }) => [desc(s.createdAt)],
    with: {
      carrera: true,
      documentos: true,
      asignaturas: { with: { asignatura: true } },
    },
  });
}

export async function getSolicitudesRegimen() {
  await requireAdmin();
  return await db.query.regimenSolicitudes.findMany({
    orderBy: (s, { desc }) => [desc(s.createdAt)],
    with: {
      user: true,
      carrera: true,
      documentos: true,
      asignaturas: { with: { asignatura: true } },
    },
  });
}

export async function createSolicitudRegimen(formData: FormData) {
  const session = await requireAuth();

  const asignaturaIdsRaw = formData.get("asignaturaIds") as string | null;
  const documentosRaw = formData.get("documentos") as string | null;

  const data = {
    apellidos: (formData.get("apellidos") as string)?.trim(),
    nombres: (formData.get("nombres") as string)?.trim(),
    dni: (formData.get("dni") as string)?.trim(),
    telefono: (formData.get("telefono") as string)?.trim(),
    motivo: formData.get("motivo") as string,
    sede: formData.get("sede") as string,
    carreraId: formData.get("carreraId") as string,
    observaciones: (formData.get("observaciones") as string)?.trim() || null,
    asignaturaIds: asignaturaIdsRaw ? JSON.parse(asignaturaIdsRaw) : [],
    documentos: documentosRaw ? JSON.parse(documentosRaw) : [],
  };

  const validated = solicitudSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  // Validación de documentación obligatoria según el motivo.
  const tipos = new Set<RegimenDocTipo>(
    validated.data.documentos.map((d) => d.tipo)
  );
  const docErrors: string[] = [];
  for (const req of DOC_GENERALES) {
    if (!tipos.has(req)) {
      docErrors.push(`Falta la documentación general: ${DOC_TIPO_LABELS[req]}`);
    }
  }
  if (
    motivoIncluyeLaboral(validated.data.motivo) &&
    !DOC_LABORALES.some((t) => tipos.has(t))
  ) {
    docErrors.push(
      "Adjunte al menos un documento que acredite la situación laboral"
    );
  }
  if (
    motivoIncluyePersonas(validated.data.motivo) &&
    !DOC_PERSONAS.some((t) => tipos.has(t))
  ) {
    docErrors.push(
      "Adjunte al menos un documento que acredite las personas a cargo"
    );
  }
  if (docErrors.length > 0) {
    return { error: { documentos: docErrors } };
  }

  // Una sola solicitud activa (pendiente o aprobada) por estudiante.
  const existing = await db.query.regimenSolicitudes.findFirst({
    where: and(
      eq(regimenSolicitudes.userId, session.user.id),
      inArray(regimenSolicitudes.estado, ["pendiente", "aprobada"])
    ),
  });
  if (existing) {
    return {
      error: {
        general: [
          "Ya tenés una solicitud en curso. No podés enviar otra hasta que sea resuelta.",
        ],
      },
    };
  }

  await db.transaction(async (tx) => {
    const [solicitud] = await tx
      .insert(regimenSolicitudes)
      .values({
        userId: session.user.id,
        apellidos: validated.data.apellidos,
        nombres: validated.data.nombres,
        dni: validated.data.dni,
        telefono: validated.data.telefono,
        motivo: validated.data.motivo,
        sede: validated.data.sede,
        carreraId: validated.data.carreraId,
        observaciones: validated.data.observaciones,
      })
      .returning();

    if (validated.data.asignaturaIds.length > 0) {
      await tx.insert(regimenAsignaturas).values(
        validated.data.asignaturaIds.map((asignaturaId) => ({
          solicitudId: solicitud.id,
          asignaturaId,
        }))
      );
    }

    if (validated.data.documentos.length > 0) {
      await tx.insert(regimenDocumentos).values(
        validated.data.documentos.map((d) => ({
          solicitudId: solicitud.id,
          tipo: d.tipo,
          fileName: d.fileName,
          originalName: d.originalName,
          mimeType: d.mimeType,
          size: d.size,
        }))
      );
    }
  });

  revalidatePath("/regimen-especial");
  revalidatePath("/admin/regimen-especial");
  return { success: true };
}

export async function updateEstadoSolicitud(
  id: string,
  estado: "aprobada" | "rechazada",
  observacionesRevision?: string
) {
  const session = await requireAdmin();

  if (estado !== "aprobada" && estado !== "rechazada") {
    return { error: "Estado inválido" };
  }

  const nota = observacionesRevision?.trim() || null;
  if (estado === "rechazada" && !nota) {
    return { error: "Debe indicar el motivo del rechazo" };
  }

  const [updated] = await db
    .update(regimenSolicitudes)
    .set({
      estado,
      observacionesRevision: nota,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(regimenSolicitudes.id, id))
    .returning();

  if (!updated) {
    return { error: "Solicitud no encontrada" };
  }

  // Notificación por email. Si falla el envío, no se revierte la decisión.
  try {
    const applicant = await db.query.user.findFirst({
      where: eq(user.id, updated.userId),
      columns: { email: true, name: true },
    });
    if (applicant?.email) {
      await sendRegimenDecisionEmail({
        to: applicant.email,
        nombre: applicant.name,
        estado,
        motivo: updated.motivo,
        nota,
      });
    }
  } catch (error) {
    console.error("Error enviando email de régimen especial:", error);
  }

  revalidatePath("/regimen-especial");
  revalidatePath("/admin/regimen-especial");
  return { success: true };
}

export async function deleteSolicitudRegimen(id: string) {
  await requireAdmin();
  await db.delete(regimenSolicitudes).where(eq(regimenSolicitudes.id, id));
  revalidatePath("/regimen-especial");
  revalidatePath("/admin/regimen-especial");
  return { success: true };
}

// --- Cambio de comisión (posterior a la aprobación de la solicitud) ---

// Comisiones: solo números (o vacío). Se valida en el cliente y acá también.
const comisionInput = z
  .string()
  .trim()
  .max(20)
  .regex(/^\d*$/, "Las comisiones solo pueden contener números")
  .optional()
  .nullable();

const cambiosComisionSchema = z.object({
  solicitudId: z.string().uuid(),
  cambios: z.array(
    z.object({
      asignaturaId: z.string().uuid(),
      comisionActual: comisionInput,
      comisionDeseada: comisionInput,
    })
  ),
});

const normComision = (v: string | null | undefined) => {
  const t = v?.trim();
  return t ? t : null;
};

// El estudiante carga/edita los cambios de comisión de su solicitud aprobada.
// No se tocan las asignaturas cuyo cambio ya fue aprobado (quedan bloqueadas).
export async function updateCambiosComision(input: {
  solicitudId: string;
  cambios: {
    asignaturaId: string;
    comisionActual: string | null;
    comisionDeseada: string | null;
  }[];
}) {
  const session = await requireAuth();

  const validated = cambiosComisionSchema.safeParse(input);
  if (!validated.success) {
    const msg =
      validated.error.issues.find((i) => i.message.includes("números"))
        ?.message ?? "Datos inválidos";
    return { error: msg };
  }

  const solicitud = await db.query.regimenSolicitudes.findFirst({
    where: eq(regimenSolicitudes.id, validated.data.solicitudId),
    with: {
      asignaturas: {
        columns: { asignaturaId: true, comisionEstado: true },
      },
    },
  });

  if (!solicitud || solicitud.userId !== session.user.id) {
    return { error: "Solicitud no encontrada" };
  }
  if (solicitud.estado !== "aprobada") {
    return { error: "La solicitud todavía no fue aprobada" };
  }

  // Estado actual por asignatura: se ignoran las que no pertenecen a la
  // solicitud y las que ya están aprobadas (bloqueadas).
  const estadoByAsignatura = new Map(
    solicitud.asignaturas.map((a) => [a.asignaturaId, a.comisionEstado])
  );

  await db.transaction(async (tx) => {
    for (const c of validated.data.cambios) {
      const estado = estadoByAsignatura.get(c.asignaturaId);
      if (estado === undefined || estado === "aprobado") continue;
      await tx
        .update(regimenAsignaturas)
        .set({
          comisionActual: normComision(c.comisionActual),
          comisionDeseada: normComision(c.comisionDeseada),
        })
        .where(
          and(
            eq(regimenAsignaturas.solicitudId, validated.data.solicitudId),
            eq(regimenAsignaturas.asignaturaId, c.asignaturaId)
          )
        );
    }
  });

  revalidatePath("/regimen-especial");
  revalidatePath("/admin/regimen-especial");
  return { success: true };
}

// El admin aprueba el cambio de comisión de UNA asignatura: queda bloqueada.
export async function aprobarCambioComisionAsignatura(
  regimenAsignaturaId: string
) {
  const session = await requireAdmin();

  const [updated] = await db
    .update(regimenAsignaturas)
    .set({
      comisionEstado: "aprobado",
      comisionAprobadoBy: session.user.id,
      comisionAprobadoAt: new Date(),
    })
    .where(eq(regimenAsignaturas.id, regimenAsignaturaId))
    .returning();

  if (!updated) {
    return { error: "Asignatura no encontrada" };
  }

  revalidatePath("/regimen-especial");
  revalidatePath("/admin/regimen-especial");
  return { success: true };
}

// El admin reabre la edición del cambio de comisión de UNA asignatura.
export async function reabrirCambioComisionAsignatura(
  regimenAsignaturaId: string
) {
  await requireAdmin();

  const [updated] = await db
    .update(regimenAsignaturas)
    .set({
      comisionEstado: "pendiente",
      comisionAprobadoBy: null,
      comisionAprobadoAt: null,
    })
    .where(eq(regimenAsignaturas.id, regimenAsignaturaId))
    .returning();

  if (!updated) {
    return { error: "Asignatura no encontrada" };
  }

  revalidatePath("/regimen-especial");
  revalidatePath("/admin/regimen-especial");
  return { success: true };
}

// --- Informe de cambios de comisión (para el panel admin) ---

export type ReporteFlujo = { desde: string; hacia: string; count: number };

export type ReporteCarrera = {
  carreraId: string;
  carrera: string;
  color: string;
  estudiantes: number;
  cambios: number;
  aprobados: number;
  pendientes: number;
};

export type ReporteAsignatura = {
  asignaturaId: string;
  asignatura: string;
  carrera: string;
  color: string;
  estudiantes: number;
  aprobados: number;
  pendientes: number;
  flujos: ReporteFlujo[];
};

export type ReporteCambiosComision = {
  totals: {
    estudiantes: number;
    cambios: number;
    aprobados: number;
    pendientes: number;
    carreras: number;
    asignaturas: number;
  };
  porCarrera: ReporteCarrera[];
  porAsignatura: ReporteAsignatura[];
};

// Un "cambio de comisión" es una asignatura de una solicitud aprobada donde el
// estudiante declaró comisión actual y/o deseada (mismo criterio que usa la
// pantalla de revisión). Un estudiante "migra" si tiene al menos un cambio.
const esCambioComision = (a: {
  comisionActual: string | null;
  comisionDeseada: string | null;
}) => Boolean(a.comisionActual || a.comisionDeseada);

export async function getReporteCambiosComision(): Promise<ReporteCambiosComision> {
  await requireAdmin();

  const solicitudes = await db.query.regimenSolicitudes.findMany({
    where: eq(regimenSolicitudes.estado, "aprobada"),
    with: {
      carrera: { columns: { id: true, name: true, color: true } },
      asignaturas: {
        with: { asignatura: { columns: { id: true, name: true } } },
      },
    },
  });

  const carreraMap = new Map<string, ReporteCarrera>();
  const asignaturaMap = new Map<
    string,
    ReporteAsignatura & { flujoMap: Map<string, ReporteFlujo> }
  >();

  let totalEstudiantes = 0;
  let totalCambios = 0;
  let totalAprobados = 0;
  let totalPendientes = 0;

  for (const s of solicitudes) {
    const cambios = s.asignaturas.filter(esCambioComision);
    if (cambios.length === 0) continue;

    totalEstudiantes++;

    let carrera = carreraMap.get(s.carrera.id);
    if (!carrera) {
      carrera = {
        carreraId: s.carrera.id,
        carrera: s.carrera.name,
        color: s.carrera.color,
        estudiantes: 0,
        cambios: 0,
        aprobados: 0,
        pendientes: 0,
      };
      carreraMap.set(s.carrera.id, carrera);
    }
    carrera.estudiantes++;

    for (const a of cambios) {
      const aprobado = a.comisionEstado === "aprobado";
      totalCambios++;
      if (aprobado) totalAprobados++;
      else totalPendientes++;

      carrera.cambios++;
      if (aprobado) carrera.aprobados++;
      else carrera.pendientes++;

      let asig = asignaturaMap.get(a.asignaturaId);
      if (!asig) {
        asig = {
          asignaturaId: a.asignaturaId,
          asignatura: a.asignatura.name,
          carrera: s.carrera.name,
          color: s.carrera.color,
          estudiantes: 0,
          aprobados: 0,
          pendientes: 0,
          flujos: [],
          flujoMap: new Map(),
        };
        asignaturaMap.set(a.asignaturaId, asig);
      }
      // Una fila por (solicitud, asignatura) ⇒ un estudiante por cambio.
      asig.estudiantes++;
      if (aprobado) asig.aprobados++;
      else asig.pendientes++;

      const desde = a.comisionActual || "—";
      const hacia = a.comisionDeseada || "—";
      const key = `${desde}→${hacia}`;
      let flujo = asig.flujoMap.get(key);
      if (!flujo) {
        flujo = { desde, hacia, count: 0 };
        asig.flujoMap.set(key, flujo);
      }
      flujo.count++;
    }
  }

  const porCarrera = [...carreraMap.values()].sort(
    (a, b) => b.estudiantes - a.estudiantes || b.cambios - a.cambios
  );

  const porAsignatura = [...asignaturaMap.values()]
    .map(({ flujoMap, ...rest }) => ({
      ...rest,
      flujos: [...flujoMap.values()].sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.estudiantes - a.estudiantes || b.aprobados - a.aprobados);

  return {
    totals: {
      estudiantes: totalEstudiantes,
      cambios: totalCambios,
      aprobados: totalAprobados,
      pendientes: totalPendientes,
      carreras: carreraMap.size,
      asignaturas: asignaturaMap.size,
    },
    porCarrera,
    porAsignatura,
  };
}

async function sendRegimenDecisionEmail({
  to,
  nombre,
  estado,
  motivo,
  nota,
}: {
  to: string;
  nombre: string;
  estado: "aprobada" | "rechazada";
  motivo: (typeof REGIMEN_MOTIVOS)[number];
  nota: string | null;
}) {
  const aprobada = estado === "aprobada";
  const titulo = aprobada
    ? "Tu solicitud fue aprobada"
    : "Tu solicitud fue rechazada";
  const color = aprobada ? "#16a34a" : "#dc2626";

  await sendEmail({
    to,
    subject: `Régimen especial de cursado - ${ESTADO_LABELS[estado]}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${color};">${titulo}</h2>
        <p>¡Hola ${nombre}!</p>
        <p>Tu solicitud de inscripción al <strong>Régimen especial de cursado</strong>
        (motivo: ${MOTIVO_LABELS[motivo]}) fue
        <strong>${ESTADO_LABELS[estado].toLowerCase()}</strong>.</p>
        ${
          nota
            ? `<p style="background:#f5f5f5;border-radius:6px;padding:12px 16px;">
                 <strong>Observaciones:</strong><br/>${nota.replace(
                   /\n/g,
                   "<br/>"
                 )}
               </p>`
            : ""
        }
        <p style="color: #666; font-size: 14px;">
          Podés ver el detalle ingresando a tu cuenta en la sección
          "Régimen especial".
        </p>
      </div>
    `,
  });
}
