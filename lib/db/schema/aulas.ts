import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cursadas } from "./cursadas";
import { sedes } from "./sedes";

export const aulas = pgTable("aulas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // e.g., "Aula 101"
  building: text("building").notNull(), // e.g., "Edificio A"
  capacity: integer("capacity"), // Optional
  // Cada aula pertenece a una sede; la cursada hereda la sede de su aula.
  sedeId: uuid("sede_id")
    .notNull()
    .references(() => sedes.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aulasRelations = relations(aulas, ({ one, many }) => ({
  sede: one(sedes, {
    fields: [aulas.sedeId],
    references: [sedes.id],
  }),
  cursadas: many(cursadas),
}));
