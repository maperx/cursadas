import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const carreras = pgTable("carreras", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3B82F6"), // HEX for UI
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const carrerasRelations = relations(carreras, ({ many }) => ({
  asignaturas: many(asignaturas),
  cursadas: many(cursadas),
}));

// Forward declaration for relations - will be imported from asignaturas
import { asignaturas } from "./asignaturas";
import { cursadas } from "./cursadas";
