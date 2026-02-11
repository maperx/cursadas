import { pgTable, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { estudiantes } from "./estudiantes";
import { cursadas } from "./cursadas";

export const inscripcionStatusEnum = pgEnum("inscripcion_status", [
  "activa",
  "baja",
]);

export const inscripciones = pgTable("inscripciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  estudianteId: uuid("estudiante_id")
    .notNull()
    .references(() => estudiantes.id, { onDelete: "cascade" }),
  cursadaId: uuid("cursada_id")
    .notNull()
    .references(() => cursadas.id, { onDelete: "cascade" }),
  status: inscripcionStatusEnum("status").notNull().default("activa"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inscripcionesRelations = relations(inscripciones, ({ one }) => ({
  estudiante: one(estudiantes, {
    fields: [inscripciones.estudianteId],
    references: [estudiantes.id],
  }),
  cursada: one(cursadas, {
    fields: [inscripciones.cursadaId],
    references: [cursadas.id],
  }),
}));
