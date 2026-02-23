"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-64 p-0" aria-describedby={undefined}>
        <DialogHeader className="border-b p-4">
          <DialogTitle>
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold"
              onClick={() => onOpenChange(false)}
            >
              <Home className="h-5 w-5" />
              <span>Gestión Cursadas</span>
            </Link>
          </DialogTitle>
        </DialogHeader>
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => onOpenChange(false)}
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
      </DialogContent>
    </Dialog>
  );
}
