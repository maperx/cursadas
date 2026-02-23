import { pgTable, text, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { carreras } from "./carreras";
import { cursadas } from "./cursadas";
import { user } from "./auth";

export const asignaturas = pgTable("asignaturas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  carreraId: uuid("carrera_id")
    .notNull()
    .references(() => carreras.id, { onDelete: "cascade" }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const asignaturasRelations = relations(asignaturas, ({ one, many }) => ({
  carrera: one(carreras, {
    fields: [asignaturas.carreraId],
    references: [carreras.id],
  }),
  cursadas: many(cursadas),
  asignaturaDocentes: many(asignaturaDocentes),
}));

// Junction table for asignaturas <-> docentes (many-to-many)
export const asignaturaDocentes = pgTable("asignatura_docentes", {
  id: uuid("id").primaryKey().defaultRandom(),
  asignaturaId: uuid("asignatura_id")
    .notNull()
    .references(() => asignaturas.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const asignaturaDocentesRelations = relations(
  asignaturaDocentes,
  ({ one }) => ({
    asignatura: one(asignaturas, {
      fields: [asignaturaDocentes.asignaturaId],
      references: [asignaturas.id],
    }),
    user: one(user, {
      fields: [asignaturaDocentes.userId],
      references: [user.id],
    }),
  })
);
