import { relations } from "drizzle-orm";
import { user } from "./auth";
import { inscripciones } from "./inscripciones";
import { cursadaDocentes } from "./cursadas";
import { asignaturaDocentes } from "./asignaturas";
import { userPermissions } from "./permissions";

export const userRelations = relations(user, ({ many }) => ({
  inscripciones: many(inscripciones),
  cursadaDocentes: many(cursadaDocentes),
  asignaturaDocentes: many(asignaturaDocentes),
  permissions: many(userPermissions),
}));
