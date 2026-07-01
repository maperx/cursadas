import {
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
import {
  REGIMEN_DOC_TIPOS,
  REGIMEN_ESTADOS,
  REGIMEN_MOTIVOS,
  REGIMEN_SEDES,
} from "../../regimen-especial";

export const regimenEstadoEnum = pgEnum("regimen_estado", REGIMEN_ESTADOS);
export const regimenMotivoEnum = pgEnum("regimen_motivo", REGIMEN_MOTIVOS);
export const regimenSedeEnum = pgEnum("regimen_sede", REGIMEN_SEDES);
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
  sede: regimenSedeEnum("sede").notNull(),
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
