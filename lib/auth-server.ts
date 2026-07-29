import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";
import { loadPermissions } from "./permissions-server";
import {
  EMPTY_PERMISSIONS,
  can,
  type PermissionAction,
  type PermissionSet,
  type ResourceKey,
} from "./permissions";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

/** Permisos del usuario de la request (una sola consulta por request). */
export const getPermissions = cache(async (): Promise<PermissionSet> => {
  const session = await getSession();
  if (!session) return EMPTY_PERMISSIONS;
  return loadPermissions(session.user);
});

/**
 * Exige un permiso concreto. Para cursadas, `sedeId` acota el permiso a esa
 * sede; sin `sedeId` alcanza con tenerlo en alguna.
 */
export async function requirePermission(
  resource: ResourceKey,
  action: PermissionAction,
  sedeId?: string | null
) {
  const session = await requireAuth();
  const perms = await getPermissions();
  if (!can(perms, resource, action, sedeId)) {
    throw new Error("Forbidden");
  }
  return { session, perms };
}

/** Solo el Superadmin (configurado en SUPERADMIN_EMAILS). */
export async function requireSuperadmin() {
  const session = await requireAuth();
  const perms = await getPermissions();
  if (!perms.superadmin) {
    throw new Error("Forbidden");
  }
  return session;
}
