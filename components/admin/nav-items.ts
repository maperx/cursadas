import {
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Newspaper,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import {
  RESOURCES,
  can,
  type PermissionSet,
  type ResourceKey,
} from "@/lib/permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Color del ícono en las tarjetas del panel principal. */
  color: string;
};

const RESOURCE_UI: Record<ResourceKey, { icon: LucideIcon; color: string }> = {
  sedes: { icon: MapPin, color: "text-orange-500" },
  carreras: { icon: GraduationCap, color: "text-blue-500" },
  asignaturas: { icon: BookOpen, color: "text-green-500" },
  aulas: { icon: DoorOpen, color: "text-cyan-500" },
  cursadas: { icon: Building2, color: "text-red-500" },
  inscripciones: { icon: ClipboardList, color: "text-yellow-500" },
  regimen: { icon: ClipboardCheck, color: "text-pink-500" },
  noticias: { icon: Newspaper, color: "text-purple-500" },
  usuarios: { icon: UserCog, color: "text-slate-500" },
};

export const DASHBOARD_ITEM: NavItem = {
  title: "Panel principal",
  href: "/admin",
  icon: LayoutDashboard,
  color: "text-muted-foreground",
};

/** Secciones que el usuario puede ver, según sus permisos. */
export function getSectionItems(
  perms: PermissionSet | null | undefined
): NavItem[] {
  return RESOURCES.filter((resource) => can(perms, resource.key, "view")).map(
    (resource) => ({
      title: resource.label,
      href: resource.href,
      ...RESOURCE_UI[resource.key],
    })
  );
}

/** Ítems del menú lateral: panel principal + secciones habilitadas. */
export function getNavItems(
  perms: PermissionSet | null | undefined
): NavItem[] {
  return [DASHBOARD_ITEM, ...getSectionItems(perms)];
}
