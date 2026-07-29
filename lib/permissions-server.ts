import { eq } from "drizzle-orm";
import { db } from "./db";
import { userPermissions } from "./db/schema";
import {
  EMPTY_PERMISSIONS,
  SUPERADMIN_PERMISSIONS,
  isResourceKey,
  type PermissionAction,
  type PermissionSet,
  type ResourceKey,
} from "./permissions";

/**
 * Emails con rol Superadmin, configurables por entorno:
 *
 *   SUPERADMIN_EMAILS=uno@dominio.com,otro@dominio.com
 *
 * El Superadmin tiene todos los permisos y es el único que puede editar los
 * permisos de los demás usuarios.
 */
export function getSuperadminEmails(): string[] {
  return (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getSuperadminEmails().includes(email.toLowerCase());
}

/**
 * Permisos efectivos de un usuario. Solo el Superadmin y los usuarios con rol
 * `admin` tienen permisos en el panel: para el resto se ignoran las filas que
 * puedan haber quedado en la tabla.
 */
export async function loadPermissions(u: {
  id: string;
  email: string;
  role?: string | null;
}): Promise<PermissionSet> {
  if (isSuperadminEmail(u.email)) return SUPERADMIN_PERMISSIONS;
  if (u.role !== "admin") return EMPTY_PERMISSIONS;

  const rows = await db.query.userPermissions.findMany({
    where: eq(userPermissions.userId, u.id),
  });

  const perms: PermissionSet = {
    superadmin: false,
    resources: {},
    cursadasPorSede: {},
  };

  for (const row of rows) {
    if (!isResourceKey(row.resource)) continue;
    const actions = row.actions as PermissionAction[];
    if (actions.length === 0) continue;

    if (row.sedeId) {
      perms.cursadasPorSede[row.sedeId] = actions;
    } else {
      perms.resources[row.resource as ResourceKey] = actions;
    }
  }

  return perms;
}
