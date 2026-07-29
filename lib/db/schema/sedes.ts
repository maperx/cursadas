import { boolean, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { aulas } from "./aulas";
import { carreras } from "./carreras";

// Una sede es un espacio físico separado (Paraná, Ramírez, etc).
// Las aulas pertenecen a una sola sede; las carreras pueden dictarse en varias.
export const sedes = pgTable("sedes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sedesRelations = relations(sedes, ({ many }) => ({
  aulas: many(aulas),
  carreraSedes: many(carreraSedes),
}));

// Junction table for carreras <-> sedes (many-to-many): una carrera puede
// dictarse en más de una sede.
export const carreraSedes = pgTable(
  "carrera_sedes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    carreraId: uuid("carrera_id")
      .notNull()
      .references(() => carreras.id, { onDelete: "cascade" }),
    sedeId: uuid("sede_id")
      .notNull()
      .references(() => sedes.id, { onDelete: "cascade" }),
  },
  (t) => ({
    carreraSedeUnique: unique().on(t.carreraId, t.sedeId),
  })
);

export const carreraSedesRelations = relations(carreraSedes, ({ one }) => ({
  carrera: one(carreras, {
    fields: [carreraSedes.carreraId],
    references: [carreras.id],
  }),
  sede: one(sedes, {
    fields: [carreraSedes.sedeId],
    references: [sedes.id],
  }),
}));
