import { getUsers } from "@/actions/users";
import { getSedes } from "@/actions/sedes";
import { getPermisosPorUsuario } from "@/actions/permissions";
import { getPermissions } from "@/lib/auth-server";
import { getSuperadminEmails } from "@/lib/permissions-server";
import { can } from "@/lib/permissions";
import { UsuariosTable } from "./usuarios-table";

export default async function UsuariosPage() {
  const perms = await getPermissions();
  const users = await getUsers();

  // Los permisos por usuario solo los ve y los edita el Superadmin.
  const [permisos, sedesRaw] = perms.superadmin
    ? await Promise.all([getPermisosPorUsuario(), getSedes()])
    : [{}, []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">
          {perms.superadmin
            ? "Gestiona los roles y los permisos de los usuarios del sistema"
            : "Gestiona los roles de los usuarios del sistema"}
        </p>
      </div>

      <UsuariosTable
        data={users}
        canEditRole={can(perms, "usuarios", "edit")}
        isSuperadmin={perms.superadmin}
        sedes={sedesRaw.map((sede) => ({ id: sede.id, name: sede.name }))}
        permisos={permisos}
        superadminEmails={perms.superadmin ? getSuperadminEmails() : []}
      />
    </div>
  );
}
