import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { carreras } from "./carreras";
import { asignaturas } from "./asignaturas";
import { sedes } from "./sedes";
import {
  REGIMEN_CAMBIO_ESTADOS,
  REGIMEN_DOC_TIPOS,
  REGIMEN_EMAIL_TIPOS,
  REGIMEN_ESTADOS,
  REGIMEN_MOTIVOS,
} from "../../regimen-especial";

export const regimenEstadoEnum = pgEnum("regimen_estado", REGIMEN_ESTADOS);
export const regimenCambioEstadoEnum = pgEnum(
  "regimen_cambio_estado",
  REGIMEN_CAMBIO_ESTADOS
);
export const regimenMotivoEnum = pgEnum("regimen_motivo", REGIMEN_MOTIVOS);
export const regimenDocumentoTipoEnum = pgEnum(
  "regimen_documento_tipo",
  REGIMEN_DOC_TIPOS
);

// Solicitud de inscripción al régimen especial de cursado.
export const regimenSolicitudes = pgTable("regimen_solicitudes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  apellidos: text("apellidos").notNull(),
  nombres: text("nombres").notNull(),
  dni: text("dni").notNull(),
  telefono: text("telefono").notNull(),
  motivo: regimenMotivoEnum("motivo").notNull(),
  // restrict: no se puede borrar una sede con solicitudes asociadas.
  sedeId: uuid("sede_id")
    .notNull()
    .references(() => sedes.id, { onDelete: "restrict" }),
  // restrict: no se puede borrar una carrera con solicitudes asociadas.
  carreraId: uuid("carrera_id")
    .notNull()
    .references(() => carreras.id, { onDelete: "restrict" }),
  observaciones: text("observaciones"),
  estado: regimenEstadoEnum("estado").notNull().default("pendiente"),
  // Nota del admin al aprobar/rechazar (motivo de rechazo, aclaraciones).
  observacionesRevision: text("observaciones_revision"),
  reviewedBy: text("reviewed_by").references(() => user.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const regimenSolicitudesRelations = relations(
  regimenSolicitudes,
  ({ one, many }) => ({
    user: one(user, {
      fields: [regimenSolicitudes.userId],
      references: [user.id],
    }),
    carrera: one(carreras, {
      fields: [regimenSolicitudes.carreraId],
      references: [carreras.id],
    }),
    sede: one(sedes, {
      fields: [regimenSolicitudes.sedeId],
      references: [sedes.id],
    }),
    documentos: many(regimenDocumentos),
    asignaturas: many(regimenAsignaturas),
  })
);

// Asignaturas en las que el estudiante se inscribió a cursar.
export const regimenAsignaturas = pgTable(
  "regimen_asignaturas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    solicitudId: uuid("solicitud_id")
      .notNull()
      .references(() => regimenSolicitudes.id, { onDelete: "cascade" }),
    asignaturaId: uuid("asignatura_id")
      .notNull()
      .references(() => asignaturas.id, { onDelete: "cascade" }),
    // comisionActual: comisión en la que el estudiante declaró estar inscripto
    // al enviar la solicitud (obligatoria por asignatura desde entonces; null
    // en las solicitudes anteriores a este campo).
    // comisionDeseada: a dónde quiere pasarse, se carga recién con la solicitud
    // aprobada. Solo números; vacío = sin cambio para esa asignatura.
    comisionActual: text("comision_actual"),
    comisionDeseada: text("comision_deseada"),
    // El admin aprueba el cambio de comisión de forma independiente por cada
    // asignatura. Mientras está "pendiente" el estudiante puede editarlo; al
    // pasar a "aprobado" queda bloqueado para esa asignatura.
    comisionEstado: regimenCambioEstadoEnum("comision_estado")
      .notNull()
      .default("pendiente"),
    comisionAprobadoBy: text("comision_aprobado_by").references(
      () => user.id,
      { onDelete: "set null" }
    ),
    comisionAprobadoAt: timestamp("comision_aprobado_at"),
  },
  (t) => ({
    uniqueSolicitudAsignatura: unique().on(t.solicitudId, t.asignaturaId),
  })
);

export const regimenAsignaturasRelations = relations(
  regimenAsignaturas,
  ({ one }) => ({
    solicitud: one(regimenSolicitudes, {
      fields: [regimenAsignaturas.solicitudId],
      references: [regimenSolicitudes.id],
    }),
    asignatura: one(asignaturas, {
      fields: [regimenAsignaturas.asignaturaId],
      references: [asignaturas.id],
    }),
  })
);

// Documentación adjunta. Los archivos se guardan fuera de public/ y se sirven
// por una ruta autenticada (solo el dueño o un admin).
export const regimenDocumentos = pgTable("regimen_documentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  solicitudId: uuid("solicitud_id")
    .notNull()
    .references(() => regimenSolicitudes.id, { onDelete: "cascade" }),
  tipo: regimenDocumentoTipoEnum("tipo").notNull(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const regimenDocumentosRelations = relations(
  regimenDocumentos,
  ({ one }) => ({
    solicitud: one(regimenSolicitudes, {
      fields: [regimenDocumentos.solicitudId],
      references: [regimenSolicitudes.id],
    }),
  })
);

export const regimenEmailTipoEnum = pgEnum(
  "regimen_email_tipo",
  REGIMEN_EMAIL_TIPOS
);

// Plantillas de los emails automáticos al estudiante: una fila por tipo, que se
// crea al guardarla por primera vez desde el panel (hasta entonces rige el
// texto por defecto de REGIMEN_EMAIL_DEFAULTS). El PDF adjunto se guarda fuera
// de public/ y se lee al momento de enviar.
export const regimenEmailPlantillas = pgTable("regimen_email_plantillas", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: regimenEmailTipoEnum("tipo").notNull().unique(),
  asunto: text("asunto").notNull(),
  // HTML generado por el editor de texto enriquecido del panel.
  cuerpo: text("cuerpo").notNull(),
  // Permite silenciar la notificación sin perder el texto configurado.
  activo: boolean("activo").notNull().default(true),
  adjuntoFileName: text("adjunto_file_name"),
  adjuntoOriginalName: text("adjunto_original_name"),
  adjuntoMimeType: text("adjunto_mime_type"),
  adjuntoSize: integer("adjunto_size"),
  updatedBy: text("updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
