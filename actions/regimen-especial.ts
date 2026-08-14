"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  regimenAsignaturas,
  regimenDocumentos,
  regimenEmailPlantillas,
  regimenSolicitudes,
  user,
} from "@/lib/db/schema";
import { requireAuth, requirePermission } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email";
import {
  enviarEmailRegimen,
  getPlantillas,
  varsDeSolicitud,
  type RegimenEmailPlantilla,
} from "@/lib/regimen-email";
import {
  CAMBIO_ESTADO_LABELS,
  DOC_GENERALES,
  DOC_LABORALES,
  DOC_PERSONAS,
  DOC_TIPO_LABELS,
  ESTADO_LABELS,
  MOTIVO_LABELS,
  REGIMEN_CAMBIO_RESOLUCIONES,
  REGIMEN_DOC_TIPOS,
  REGIMEN_EMAIL_ADJUNTO_TYPE,
  REGIMEN_EMAIL_TIPOS,
  REGIMEN_MOTIVOS,
  cambioResuelto,
  esCambioComision,
  motivoIncluyeLaboral,
  motivoIncluyePersonas,
  resumenCambiosComision,
  type RegimenCambioResolucion,
  type RegimenDocTipo,
  type RegimenEstado,
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
  sedeId: z.string().uuid("Sede inválida"),
  carreraId: z.string().uuid("Carrera inválida"),
  observaciones: z.string().optional().nullable(),
  // Por cada asignatura marcada, la comisión en la que está inscripto.
  asignaturas: z
    .array(
      z.object({
        asignaturaId: z.string().uuid(),
        comision: z
          .string()
          .trim()
          .min(1, "Indique la comisión de cada asignatura")
          .max(20)
          .regex(/^\d+$/, "Las comisiones solo pueden contener números"),
      })
    )
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
      sede: true,
      documentos: true,
      asignaturas: { with: { asignatura: true } },
    },
  });
}

export async function getSolicitudesRegimen() {
  await requirePermission("regimen", "view");
  return await db.query.regimenSolicitudes.findMany({
    orderBy: (s, { desc }) => [desc(s.createdAt)],
    with: {
      user: true,
      carrera: true,
      sede: true,
      documentos: true,
      asignaturas: { with: { asignatura: true } },
    },
  });
}

export async function createSolicitudRegimen(formData: FormData) {
  const session = await requireAuth();

  const asignaturasRaw = formData.get("asignaturas") as string | null;
  const documentosRaw = formData.get("documentos") as string | null;

  const data = {
    apellidos: (formData.get("apellidos") as string)?.trim(),
    nombres: (formData.get("nombres") as string)?.trim(),
    dni: (formData.get("dni") as string)?.trim(),
    telefono: (formData.get("telefono") as string)?.trim(),
    motivo: formData.get("motivo") as string,
    sedeId: formData.get("sedeId") as string,
    carreraId: formData.get("carreraId") as string,
    observaciones: (formData.get("observaciones") as string)?.trim() || null,
    asignaturas: asignaturasRaw ? JSON.parse(asignaturasRaw) : [],
    documentos: documentosRaw ? JSON.parse(documentosRaw) : [],
  };

  const validated = solicitudSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const asignaturaIds = validated.data.asignaturas.map((a) => a.asignaturaId);
  if (new Set(asignaturaIds).size !== asignaturaIds.length) {
    return { error: { asignaturas: ["Hay asignaturas repetidas"] } };
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
        sedeId: validated.data.sedeId,
        carreraId: validated.data.carreraId,
        observaciones: validated.data.observaciones,
      })
      .returning();

    if (validated.data.asignaturas.length > 0) {
      await tx.insert(regimenAsignaturas).values(
        validated.data.asignaturas.map((a) => ({
          solicitudId: solicitud.id,
          asignaturaId: a.asignaturaId,
          comisionActual: a.comision,
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
  const { session } = await requirePermission("regimen", "resolverSolicitudes");

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
    if (applicant?.email && estado === "aprobada") {
      // La aprobación usa la plantilla configurable del panel.
      const solicitud = await getSolicitudParaEmail(updated.id);
      if (solicitud) {
        await enviarEmailRegimen({
          tipo: "solicitud_aprobada",
          to: applicant.email,
          vars: varsDeSolicitud(solicitud),
        });
      }
    } else if (applicant?.email) {
      await sendRegimenRechazoEmail({
        to: applicant.email,
        nombre: applicant.name,
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
  await requirePermission("regimen", "delete");
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
// No se tocan las asignaturas cuyo cambio ya fue resuelto (quedan bloqueadas).
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
        columns: {
          asignaturaId: true,
          comisionActual: true,
          comisionEstado: true,
        },
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
  const filaByAsignatura = new Map(
    solicitud.asignaturas.map((a) => [a.asignaturaId, a])
  );

  await db.transaction(async (tx) => {
    for (const c of validated.data.cambios) {
      const fila = filaByAsignatura.get(c.asignaturaId);
      if (fila === undefined || cambioResuelto(fila.comisionEstado)) continue;
      // La comisión actual la declaró el estudiante al enviar la solicitud y
      // no se reescribe. Solo se acepta acá si viene vacía (solicitudes
      // anteriores a que el campo fuera parte del formulario inicial).
      const comisionActual =
        fila.comisionActual ?? normComision(c.comisionActual);
      await tx
        .update(regimenAsignaturas)
        .set({
          comisionActual,
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

// Quien tiene `resolverCambios` resuelve el cambio de comisión de UNA
// asignatura: al aprobarlo o rechazarlo queda bloqueado para el estudiante. La
// observación es obligatoria para rechazar (es lo que le explica el motivo).
export async function resolverCambioComisionAsignatura(
  regimenAsignaturaId: string,
  estado: RegimenCambioResolucion,
  observaciones?: string | null
) {
  const { session } = await requirePermission("regimen", "resolverCambios");

  if (!REGIMEN_CAMBIO_RESOLUCIONES.includes(estado)) {
    return { error: "Estado inválido" };
  }

  const nota = observaciones?.trim() || null;
  if (estado === "rechazado" && !nota) {
    return { error: "Debe indicar el motivo del rechazo" };
  }

  const [updated] = await db
    .update(regimenAsignaturas)
    .set({
      comisionEstado: estado,
      comisionObservaciones: nota,
      comisionResueltoBy: session.user.id,
      comisionResueltoAt: new Date(),
    })
    .where(eq(regimenAsignaturas.id, regimenAsignaturaId))
    .returning();

  if (!updated) {
    return { error: "Asignatura no encontrada" };
  }

  const emailEnviado = await notificarCambiosResueltos(updated.solicitudId);

  revalidatePath("/regimen-especial");
  revalidatePath("/admin/regimen-especial");
  return { success: true, emailEnviado };
}

// Reabre la edición del cambio de comisión de UNA asignatura: vuelve a
// "pendiente" y se descarta la resolución anterior.
export async function reabrirCambioComisionAsignatura(
  regimenAsignaturaId: string
) {
  await requirePermission("regimen", "resolverCambios");

  const [updated] = await db
    .update(regimenAsignaturas)
    .set({
      comisionEstado: "pendiente",
      comisionObservaciones: null,
      comisionResueltoBy: null,
      comisionResueltoAt: null,
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

// Se avisa al estudiante recién cuando no le queda ningún cambio pendiente, así
// recibe un único email con todos los cambios ya resueltos (aprobados y
// rechazados). Un fallo al enviar no invalida la resolución.
async function notificarCambiosResueltos(solicitudId: string) {
  try {
    const solicitud = await getSolicitudParaEmail(solicitudId);
    if (!solicitud) return false;
    const resumen = resumenCambiosComision(solicitud);
    if (resumen.pedidos === 0 || resumen.pendientes > 0) return false;
    return await enviarEmailRegimen({
      tipo: "cambios_comision_aprobados",
      to: solicitud.user.email,
      vars: varsDeSolicitud(solicitud),
    });
  } catch (error) {
    console.error("Error enviando email de cambios de comisión:", error);
    return false;
  }
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
  rechazados: number;
  pendientes: number;
};

export type ReporteAsignatura = {
  asignaturaId: string;
  asignatura: string;
  carrera: string;
  color: string;
  estudiantes: number;
  aprobados: number;
  rechazados: number;
  pendientes: number;
  flujos: ReporteFlujo[];
};

export type ReporteCambiosComision = {
  totals: {
    estudiantes: number;
    cambios: number;
    aprobados: number;
    rechazados: number;
    pendientes: number;
    carreras: number;
    asignaturas: number;
  };
  porCarrera: ReporteCarrera[];
  porAsignatura: ReporteAsignatura[];
};

// Un "cambio de comisión" es una asignatura de una solicitud aprobada donde el
// estudiante pidió una comisión distinta de la que declaró al inscribirse
// (mismo criterio que usa la pantalla de revisión, ver esCambioComision). Un
// estudiante "migra" si tiene al menos un cambio.
export async function getReporteCambiosComision(): Promise<ReporteCambiosComision> {
  await requirePermission("regimen", "view");

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
  let totalRechazados = 0;
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
        rechazados: 0,
        pendientes: 0,
      };
      carreraMap.set(s.carrera.id, carrera);
    }
    carrera.estudiantes++;

    for (const a of cambios) {
      const estado = a.comisionEstado;
      totalCambios++;
      carrera.cambios++;

      let asig = asignaturaMap.get(a.asignaturaId);
      if (!asig) {
        asig = {
          asignaturaId: a.asignaturaId,
          asignatura: a.asignatura.name,
          carrera: s.carrera.name,
          color: s.carrera.color,
          estudiantes: 0,
          aprobados: 0,
          rechazados: 0,
          pendientes: 0,
          flujos: [],
          flujoMap: new Map(),
        };
        asignaturaMap.set(a.asignaturaId, asig);
      }
      // Una fila por (solicitud, asignatura) ⇒ un estudiante por cambio.
      asig.estudiantes++;

      if (estado === "aprobado") {
        totalAprobados++;
        carrera.aprobados++;
        asig.aprobados++;
      } else if (estado === "rechazado") {
        totalRechazados++;
        carrera.rechazados++;
        asig.rechazados++;
      } else {
        totalPendientes++;
        carrera.pendientes++;
        asig.pendientes++;
      }

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
      rechazados: totalRechazados,
      pendientes: totalPendientes,
      carreras: carreraMap.size,
      asignaturas: asignaturaMap.size,
    },
    porCarrera,
    porAsignatura,
  };
}

// --- Listado de cambios de comisión (para exportar a Excel) ---

export type CambioComisionRow = {
  apellidos: string;
  nombres: string;
  dni: string;
  telefono: string;
  email: string;
  sede: string;
  carrera: string;
  asignatura: string;
  comisionActual: string;
  comisionDeseada: string;
  estadoCambio: string;
  observacionCambio: string;
  fechaSolicitud: Date;
  fechaResolucionCambio: Date | null;
};

/** Mismos filtros que ofrece la tabla del admin (se aplican al exportar). */
export type CambiosComisionFiltros = {
  estado?: RegimenEstado | null;
  /** Nombre de la sede, tal como se muestra en el filtro de la tabla. */
  sede?: string | null;
};

// Una fila por (estudiante, asignatura) con cambio de comisión pedido, ordenada
// por estudiante (apellidos, nombres, DNI) y dentro de cada uno por asignatura.
export async function getCambiosComisionListado(
  filtros: CambiosComisionFiltros = {}
): Promise<CambioComisionRow[]> {
  await requirePermission("regimen", "view");

  // Los cambios de comisión solo existen en las solicitudes aprobadas: si la
  // tabla está filtrada por otro estado, no hay nada para exportar.
  if (filtros.estado && filtros.estado !== "aprobada") return [];

  const sede = filtros.sede?.trim() || null;

  const solicitudes = await db.query.regimenSolicitudes.findMany({
    where: eq(regimenSolicitudes.estado, "aprobada"),
    with: {
      user: { columns: { email: true } },
      carrera: { columns: { name: true } },
      sede: { columns: { name: true } },
      asignaturas: { with: { asignatura: { columns: { name: true } } } },
    },
  });

  const rows: CambioComisionRow[] = [];

  for (const s of solicitudes) {
    if (sede && s.sede.name !== sede) continue;
    for (const a of s.asignaturas.filter(esCambioComision)) {
      rows.push({
        apellidos: s.apellidos,
        nombres: s.nombres,
        dni: s.dni,
        telefono: s.telefono,
        email: s.user.email,
        sede: s.sede.name,
        carrera: s.carrera.name,
        asignatura: a.asignatura.name,
        comisionActual: a.comisionActual ?? "",
        comisionDeseada: a.comisionDeseada ?? "",
        estadoCambio: CAMBIO_ESTADO_LABELS[a.comisionEstado],
        observacionCambio: a.comisionObservaciones ?? "",
        fechaSolicitud: s.createdAt,
        fechaResolucionCambio: a.comisionResueltoAt,
      });
    }
  }

  const cmp = (a: string, b: string) => a.localeCompare(b, "es");
  rows.sort(
    (x, y) =>
      cmp(x.apellidos, y.apellidos) ||
      cmp(x.nombres, y.nombres) ||
      cmp(x.dni, y.dni) ||
      cmp(x.asignatura, y.asignatura)
  );

  return rows;
}

// Datos que necesitan las plantillas para resolver sus {{marcadores}}.
async function getSolicitudParaEmail(solicitudId: string) {
  return await db.query.regimenSolicitudes.findFirst({
    where: eq(regimenSolicitudes.id, solicitudId),
    with: {
      user: { columns: { email: true, name: true } },
      carrera: { columns: { name: true } },
      sede: { columns: { name: true } },
      asignaturas: { with: { asignatura: { columns: { name: true } } } },
    },
  });
}

// El rechazo no es configurable desde el panel: siempre lleva el motivo que
// cargó quien revisó la solicitud.
async function sendRegimenRechazoEmail({
  to,
  nombre,
  motivo,
  nota,
}: {
  to: string;
  nombre: string;
  motivo: (typeof REGIMEN_MOTIVOS)[number];
  nota: string | null;
}) {
  await sendEmail({
    to,
    subject: `Régimen especial de cursado - ${ESTADO_LABELS.rechazada}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Tu solicitud fue rechazada</h2>
        <p>¡Hola ${nombre}!</p>
        <p>Tu solicitud de inscripción al <strong>Régimen especial de cursado</strong>
        (motivo: ${MOTIVO_LABELS[motivo]}) fue
        <strong>rechazada</strong>.</p>
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

// --- Configuración de los emails al estudiante ---

/** Las dos plantillas, con el texto por defecto si todavía no se guardaron. */
export async function getRegimenEmailPlantillas(): Promise<
  RegimenEmailPlantilla[]
> {
  await requirePermission("regimen", "configurarEmails");
  return await getPlantillas(REGIMEN_EMAIL_TIPOS);
}

const plantillaSchema = z.object({
  tipo: z.enum(REGIMEN_EMAIL_TIPOS),
  asunto: z.string().trim().min(1, "El asunto es requerido").max(200),
  cuerpo: z.string().trim().min(1, "El texto del email es requerido"),
  activo: z.boolean(),
  adjunto: z
    .object({
      fileName: z.string().min(1),
      originalName: z.string().min(1),
      // El único adjunto que acepta la ruta de subida es un PDF.
      mimeType: z.string().min(1),
      size: z.number().int().nonnegative(),
    })
    .nullable(),
});

export type RegimenEmailPlantillaInput = z.infer<typeof plantillaSchema>;

export async function updateRegimenEmailPlantilla(
  input: RegimenEmailPlantillaInput
) {
  const { session } = await requirePermission("regimen", "configurarEmails");

  const validated = plantillaSchema.safeParse(input);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { tipo, asunto, cuerpo, activo, adjunto } = validated.data;
  const values = {
    asunto,
    cuerpo,
    activo,
    adjuntoFileName: adjunto?.fileName ?? null,
    adjuntoOriginalName: adjunto?.originalName ?? null,
    adjuntoMimeType: adjunto ? REGIMEN_EMAIL_ADJUNTO_TYPE : null,
    adjuntoSize: adjunto?.size ?? null,
    updatedBy: session.user.id,
    updatedAt: new Date(),
  };

  await db
    .insert(regimenEmailPlantillas)
    .values({ tipo, ...values })
    .onConflictDoUpdate({
      target: regimenEmailPlantillas.tipo,
      set: values,
    });

  revalidatePath("/admin/regimen-especial/emails");
  return { success: true };
}
