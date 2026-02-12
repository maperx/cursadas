import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  time,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { aulas } from "./aulas";
import { carreras } from "./carreras";
import { asignaturas } from "./asignaturas";
import { docentes } from "./docentes";
import { inscripciones } from "./inscripciones";

export const cursadas = pgTable("cursadas", {
  id: uuid("id").primaryKey().defaultRandom(),
  aulaId: uuid("aula_id")
    .notNull()
    .references(() => aulas.id, { onDelete: "restrict" }),
  carreraId: uuid("carrera_id")
    .notNull()
    .references(() => carreras.id, { onDelete: "cascade" }),
  asignaturaId: uuid("asignatura_id")
    .notNull()
    .references(() => asignaturas.id, { onDelete: "cascade" }),
  daysOfWeek: integer("days_of_week").array().notNull(), // [1,2,3] = Mon,Tue,Wed
  startTime: time("start_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  notes: text("notes"),
  weeklyRepetition: boolean("weekly_repetition").notNull().default(true),
  commissionNumber: text("commission_number"),
  examen: boolean("examen").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cursadasRelations = relations(cursadas, ({ one, many }) => ({
  aula: one(aulas, {
    fields: [cursadas.aulaId],
    references: [aulas.id],
  }),
  carrera: one(carreras, {
    fields: [cursadas.carreraId],
    references: [carreras.id],
  }),
  asignatura: one(asignaturas, {
    fields: [cursadas.asignaturaId],
    references: [asignaturas.id],
  }),
  cursadaDocentes: many(cursadaDocentes),
  inscripciones: many(inscripciones),
}));

// Junction table for cursadas <-> docentes (many-to-many)
export const cursadaDocentes = pgTable("cursada_docentes", {
  id: uuid("id").primaryKey().defaultRandom(),
  cursadaId: uuid("cursada_id")
    .notNull()
    .references(() => cursadas.id, { onDelete: "cascade" }),
  docenteId: uuid("docente_id")
    .notNull()
    .references(() => docentes.id, { onDelete: "cascade" }),
});

export const cursadaDocentesRelations = relations(
  cursadaDocentes,
  ({ one }) => ({
    cursada: one(cursadas, {
      fields: [cursadaDocentes.cursadaId],
      references: [cursadas.id],
    }),
    docente: one(docentes, {
      fields: [cursadaDocentes.docenteId],
      references: [docentes.id],
    }),
  })
);
