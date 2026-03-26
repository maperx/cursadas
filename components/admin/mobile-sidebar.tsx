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
import { Home } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getNavItemsForRole } from "./nav-items";

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const items = getNavItemsForRole(session?.user?.role);

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
            {items.map((item) => {
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
