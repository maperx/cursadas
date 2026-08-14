import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";
import { loadPermissions } from "./permissions-server";
import {
  EMPTY_PERMISSIONS,
  can,
  canCursada,
  type AccionCursada,
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

/**
 * Exige poder editar o borrar una cursada concreta: alcanza con el permiso
 * pleno en esa sede, o con el permiso acotado a eventos si la cursada lleva el
 * tilde Evento.
 */
export async function requireCursadaPermission(
  action: AccionCursada,
  sedeId: string | null | undefined,
  esEvento: boolean
) {
  const session = await requireAuth();
  const perms = await getPermissions();
  if (!canCursada(perms, action, sedeId, esEvento)) {
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
