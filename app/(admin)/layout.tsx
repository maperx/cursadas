import { getPermissions } from "@/lib/auth-server";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El menú se arma con los permisos del usuario: solo muestra las secciones
  // que puede ver.
  const perms = await getPermissions();

  return <AdminShell perms={perms}>{children}</AdminShell>;
}
