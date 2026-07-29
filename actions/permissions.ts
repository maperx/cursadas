"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { userPermissions } from "@/lib/db/schema";
import { requireSuperadmin } from "@/lib/auth-server";
import { isSuperadminEmail } from "@/lib/permissions-server";
import {
  RESOURCE_BY_KEY,
  isResourceKey,
  type PermissionAction,
  type ResourceKey,
} from "@/lib/permissions";

/** Permisos de un usuario tal como se editan en el diálogo del Superadmin. */
export type PermisosEditables = {
  resources: Partial<Record<ResourceKey, PermissionAction[]>>;
  cursadasPorSede: Record<string, PermissionAction[]>;
};

const permisosSchema = z.object({
  userId: z.string().min(1),
  resources: z.record(z.string(), z.array(z.string())),
  cursadasPorSede: z.record(z.string(), z.array(z.string())),
});

/** Acciones válidas para un recurso, descartando cualquier cosa inventada. */
function sanitizeActions(
  resource: ResourceKey,
  actions: string[]
): PermissionAction[] {
  const validas = RESOURCE_BY_KEY[resource].actions.map((a) => a.key);
  return validas.filter((a) => actions.includes(a));
}

/** Permisos de todos los usuarios, indexados por id. Solo Superadmin. */
export async function getPermisosPorUsuario(): Promise<
  Record<string, PermisosEditables>
> {
  await requireSuperadmin();

  const rows = await db.query.userPermissions.findMany();
  const porUsuario: Record<string, PermisosEditables> = {};

  for (const row of rows) {
    if (!isResourceKey(row.resource)) continue;
    const actions = row.actions as PermissionAction[];
    if (actions.length === 0) continue;

    const permisos = (porUsuario[row.userId] ??= {
      resources: {},
      cursadasPorSede: {},
    });

    if (row.sedeId) {
      permisos.cursadasPorSede[row.sedeId] = actions;
    } else {
      permisos.resources[row.resource] = actions;
    }
  }

  return porUsuario;
}

/**
 * Reemplaza el set completo de permisos de un usuario. Solo el Superadmin
 * puede hacerlo; los permisos del propio Superadmin no se guardan porque los
 * tiene todos por configuración.
 */
export async function updateUserPermissions(input: {
  userId: string;
  resources: Record<string, string[]>;
  cursadasPorSede: Record<string, string[]>;
}) {
  await requireSuperadmin();

  const validated = permisosSchema.safeParse(input);
  if (!validated.success) {
    return { error: "Datos inválidos" };
  }
  const { userId, resources, cursadasPorSede } = validated.data;

  const destinatario = await db.query.user.findFirst({
    where: (user, { eq: eqUser }) => eqUser(user.id, userId),
    columns: { id: true, email: true },
  });
  if (!destinatario) {
    return { error: "Usuario no encontrado" };
  }
  if (isSuperadminEmail(destinatario.email)) {
    return {
      error: "El Superadmin ya tiene todos los permisos y no se editan acá",
    };
  }

  const filas: {
    userId: string;
    resource: string;
    sedeId: string | null;
    actions: PermissionAction[];
  }[] = [];

  for (const [resource, actions] of Object.entries(resources)) {
    if (!isResourceKey(resource)) continue;
    // Los recursos por sede se cargan aparte, con su sedeId.
    if (RESOURCE_BY_KEY[resource].perSede) continue;
    const limpias = sanitizeActions(resource, actions);
    if (limpias.length > 0) {
      filas.push({ userId, resource, sedeId: null, actions: limpias });
    }
  }

  for (const [sedeId, actions] of Object.entries(cursadasPorSede)) {
    const limpias = sanitizeActions("cursadas", actions);
    if (limpias.length > 0) {
      filas.push({ userId, resource: "cursadas", sedeId, actions: limpias });
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(userPermissions).where(eq(userPermissions.userId, userId));
    if (filas.length > 0) {
      await tx.insert(userPermissions).values(filas);
    }
  });

  revalidatePath("/admin", "layout");
  return { success: true };
}
