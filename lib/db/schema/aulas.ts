import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cursadas } from "./cursadas";

export const aulas = pgTable("aulas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // e.g., "Aula 101"
  building: text("building").notNull(), // e.g., "Edificio A"
  capacity: integer("capacity"), // Optional
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aulasRelations = relations(aulas, ({ many }) => ({
  cursadas: many(cursadas),
}));
