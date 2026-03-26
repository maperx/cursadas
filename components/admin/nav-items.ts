import {
  BookOpen,
  Building2,
  GraduationCap,
  LayoutDashboard,
  Newspaper,
  UserCog,
  ClipboardList,
  DoorOpen,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
};

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Carreras",
    href: "/admin/carreras",
    icon: GraduationCap,
    roles: ["admin"],
  },
  {
    title: "Asignaturas",
    href: "/admin/asignaturas",
    icon: BookOpen,
    roles: ["admin"],
  },
  {
    title: "Aulas",
    href: "/admin/aulas",
    icon: DoorOpen,
    roles: ["admin"],
  },
  {
    title: "Cursadas",
    href: "/admin/cursadas",
    icon: Building2,
    roles: ["admin"],
  },
  {
    title: "Inscripciones",
    href: "/admin/inscripciones",
    icon: ClipboardList,
    roles: ["admin"],
  },
  {
    title: "Noticias",
    href: "/admin/noticias",
    icon: Newspaper,
  },
  {
    title: "Usuarios",
    href: "/admin/usuarios",
    icon: UserCog,
    roles: ["admin"],
  },
];

export function getNavItemsForRole(role: string | null | undefined): NavItem[] {
  return navItems.filter(
    (item) => !item.roles || item.roles.includes(role ?? "")
  );
}
