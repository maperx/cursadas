/**
 * Catálogo de permisos del panel de administración.
 *
 * Un usuario del panel (rol `admin`) solo puede hacer lo que sus permisos
 * habilitan. El Superadmin —configurado por email en SUPERADMIN_EMAILS— tiene
 * todos los permisos y es el único que puede editarlos.
 *
 * Este módulo es compartido cliente/servidor: solo tipos y funciones puras.
 */

export type PermissionAction =
  | "view"
  | "edit"
  | "delete"
  | "resolverSolicitudes"
  | "resolverCambios";

export type ResourceKey =
  | "sedes"
  | "carreras"
  | "asignaturas"
  | "aulas"
  | "cursadas"
  | "inscripciones"
  | "regimen"
  | "noticias"
  | "usuarios";

export type ActionDef = {
  key: PermissionAction;
  label: string;
  hint?: string;
};

export type ResourceDef = {
  key: ResourceKey;
  label: string;
  href: string;
  /** El permiso se otorga sede por sede en lugar de global. */
  perSede?: boolean;
  actions: ActionDef[];
};

// "Editar" incluye crear: quien puede modificar también puede dar de alta.
const VER_EDITAR_BORRAR: ActionDef[] = [
  { key: "view", label: "Ver" },
  { key: "edit", label: "Editar", hint: "Incluye crear" },
  { key: "delete", label: "Borrar" },
];

export const RESOURCES: ResourceDef[] = [
  { key: "sedes", label: "Sedes", href: "/admin/sedes", actions: VER_EDITAR_BORRAR },
  { key: "carreras", label: "Carreras", href: "/admin/carreras", actions: VER_EDITAR_BORRAR },
  {
    key: "asignaturas",
    label: "Asignaturas",
    href: "/admin/asignaturas",
    actions: VER_EDITAR_BORRAR,
  },
  { key: "aulas", label: "Aulas", href: "/admin/aulas", actions: VER_EDITAR_BORRAR },
  {
    key: "cursadas",
    label: "Cursadas",
    href: "/admin/cursadas",
    perSede: true,
    actions: VER_EDITAR_BORRAR,
  },
  {
    key: "inscripciones",
    label: "Inscripciones",
    href: "/admin/inscripciones",
    actions: [
      { key: "view", label: "Ver" },
      { key: "delete", label: "Borrar" },
    ],
  },
  {
    key: "regimen",
    label: "Régimen especial",
    href: "/admin/regimen-especial",
    actions: [
      { key: "view", label: "Ver", hint: "Solicitudes e informe" },
      {
        key: "resolverSolicitudes",
        label: "Resolver solicitudes",
        hint: "Aprobar o rechazar solicitudes",
      },
      {
        key: "resolverCambios",
        label: "Resolver cambios de comisión",
        hint: "Aprobar o reabrir cambios de comisión",
      },
      { key: "delete", label: "Borrar" },
    ],
  },
  { key: "noticias", label: "Noticias", href: "/admin/noticias", actions: VER_EDITAR_BORRAR },
  {
    key: "usuarios",
    label: "Usuarios",
    href: "/admin/usuarios",
    actions: [
      { key: "view", label: "Ver" },
      { key: "edit", label: "Editar", hint: "Cambiar el rol de un usuario" },
    ],
  },
];

export const RESOURCE_BY_KEY: Record<ResourceKey, ResourceDef> = Object.fromEntries(
  RESOURCES.map((r) => [r.key, r])
) as Record<ResourceKey, ResourceDef>;

export const RESOURCE_KEYS = RESOURCES.map((r) => r.key);

export function isResourceKey(value: string): value is ResourceKey {
  return RESOURCE_KEYS.includes(value as ResourceKey);
}

/** Permisos efectivos de un usuario, serializables para pasar al cliente. */
export type PermissionSet = {
  superadmin: boolean;
  /** Acciones habilitadas por recurso global. */
  resources: Partial<Record<ResourceKey, PermissionAction[]>>;
  /** Acciones habilitadas en cursadas, por sede. */
  cursadasPorSede: Record<string, PermissionAction[]>;
};

export const EMPTY_PERMISSIONS: PermissionSet = {
  superadmin: false,
  resources: {},
  cursadasPorSede: {},
};

export const SUPERADMIN_PERMISSIONS: PermissionSet = {
  superadmin: true,
  resources: {},
  cursadasPorSede: {},
};

/**
 * ¿El usuario puede hacer `action` sobre `resource`?
 *
 * Para cursadas, `sedeId` acota la pregunta a una sede; sin `sedeId` responde
 * si puede en al menos una.
 */
export function can(
  perms: PermissionSet | null | undefined,
  resource: ResourceKey,
  action: PermissionAction,
  sedeId?: string | null
): boolean {
  if (!perms) return false;
  if (perms.superadmin) return true;

  if (RESOURCE_BY_KEY[resource]?.perSede) {
    if (sedeId) {
      return (perms.cursadasPorSede[sedeId] ?? []).includes(action);
    }
    return Object.values(perms.cursadasPorSede).some((acciones) =>
      acciones.includes(action)
    );
  }

  return (perms.resources[resource] ?? []).includes(action);
}

/** Sedes en las que el usuario tiene `action` sobre cursadas. */
export function sedesCon(
  perms: PermissionSet | null | undefined,
  action: PermissionAction
): string[] {
  if (!perms) return [];
  return Object.entries(perms.cursadasPorSede)
    .filter(([, acciones]) => acciones.includes(action))
    .map(([sedeId]) => sedeId);
}

/** ¿Tiene al menos un permiso de lectura en el panel? */
export function canAccessAdmin(perms: PermissionSet | null | undefined): boolean {
  if (!perms) return false;
  if (perms.superadmin) return true;
  return RESOURCES.some((r) => can(perms, r.key, "view"));
}

/** Recursos que el usuario puede ver, en el orden del catálogo. */
export function visibleResources(
  perms: PermissionSet | null | undefined
): ResourceDef[] {
  return RESOURCES.filter((r) => can(perms, r.key, "view"));
}

/** Recurso al que corresponde una ruta del panel (null para el dashboard). */
export function resourceForPath(pathname: string): ResourceKey | null {
  const match = RESOURCES.find(
    (r) => pathname === r.href || pathname.startsWith(`${r.href}/`)
  );
  return match?.key ?? null;
}
