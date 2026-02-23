"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Building2,
  GraduationCap,
  Home,
  LayoutDashboard,
  UserCog,
  ClipboardList,
  DoorOpen,
} from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Carreras",
    href: "/admin/carreras",
    icon: GraduationCap,
  },
  {
    title: "Asignaturas",
    href: "/admin/asignaturas",
    icon: BookOpen,
  },
  {
    title: "Aulas",
    href: "/admin/aulas",
    icon: DoorOpen,
  },
  {
    title: "Cursadas",
    href: "/admin/cursadas",
    icon: Building2,
  },
  {
    title: "Inscripciones",
    href: "/admin/inscripciones",
    icon: ClipboardList,
  },
  {
    title: "Usuarios",
    href: "/admin/usuarios",
    icon: UserCog,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Home className="h-5 w-5" />
          <span>Gestión Cursadas</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
