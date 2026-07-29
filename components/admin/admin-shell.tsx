"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { MobileSidebar } from "@/components/admin/mobile-sidebar";
import type { PermissionSet } from "@/lib/permissions";

export function AdminShell({
  perms,
  children,
}: {
  perms: PermissionSet;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar perms={perms} />
      <MobileSidebar
        perms={perms}
        open={mobileOpen}
        onOpenChange={setMobileOpen}
      />
      <div className="flex flex-1 flex-col">
        <AdminHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
