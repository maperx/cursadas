import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { asignaturaDocentes } from "./asignaturas";
import { cursadaDocentes } from "./cursadas";

export const docentes = pgTable("docentes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const docentesRelations = relations(docentes, ({ many }) => ({
  asignaturaDocentes: many(asignaturaDocentes),
  cursadaDocentes: many(cursadaDocentes),
}));
