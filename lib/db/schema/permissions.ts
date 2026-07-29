import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "./auth";
import { sedes } from "./sedes";

/**
 * Permisos del panel por usuario. Una fila por (usuario, recurso, sede):
 * `sedeId` es NULL para los recursos globales y apunta a la sede en los
 * recursos con alcance por sede (cursadas).
 *
 * Al guardar los permisos de un usuario se reemplaza el set completo, así que
 * no hay filas duplicadas por construcción.
 */
export const userPermissions = pgTable(
  "user_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    resource: text("resource").notNull(),
    sedeId: uuid("sede_id").references(() => sedes.id, { onDelete: "cascade" }),
    actions: text("actions")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("user_permissions_user_id_idx").on(t.userId)]
);

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(user, {
    fields: [userPermissions.userId],
    references: [user.id],
  }),
  sede: one(sedes, {
    fields: [userPermissions.sedeId],
    references: [sedes.id],
  }),
}));
