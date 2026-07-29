import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPermissions, getSession } from "@/lib/auth-server";
import { getSectionItems } from "@/components/admin/nav-items";

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Solo se muestran las secciones habilitadas para este usuario.
  const perms = await getPermissions();
  const stats = getSectionItems(perms);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel principal</h1>
        <p className="text-muted-foreground">
          {perms.superadmin
            ? "Bienvenido al panel de administración (Superadmin)"
            : "Bienvenido al panel de administración"}
        </p>
      </div>

      {stats.length === 0 ? (
        <p className="text-muted-foreground">
          No tenés secciones habilitadas. Pedile al Superadmin que te asigne
          permisos.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.href} href={stat.href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Gestionar {stat.title.toLowerCase()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
