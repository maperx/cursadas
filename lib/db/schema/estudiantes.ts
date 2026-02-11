import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { inscripciones } from "./inscripciones";

export const estudiantes = pgTable("estudiantes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }), // Optional link to user account
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const estudiantesRelations = relations(estudiantes, ({ one, many }) => ({
  user: one(user, {
    fields: [estudiantes.userId],
    references: [user.id],
  }),
  inscripciones: many(inscripciones),
}));
