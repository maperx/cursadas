import { getAsignaturas } from "@/actions/asignaturas";
import { getCarreras } from "@/actions/carreras";
import { getDocentes } from "@/actions/users";
import { AsignaturasTable } from "./asignaturas-table";
import { CreateAsignaturaButton } from "./create-asignatura-button";
import { getPermissions } from "@/lib/auth-server";
import { can } from "@/lib/permissions";

export default async function AsignaturasPage() {
  const perms = await getPermissions();
  const canEdit = can(perms, "asignaturas", "edit");
  const canDelete = can(perms, "asignaturas", "delete");

  const [asignaturas, carreras, docentes] = await Promise.all([
    getAsignaturas(),
    getCarreras(),
    getDocentes(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Asignaturas</h1>
          <p className="text-muted-foreground">
            Gestiona las asignaturas de la facultad
          </p>
        </div>
        {canEdit && (
          <CreateAsignaturaButton carreras={carreras} docentes={docentes} />
        )}
      </div>

      <AsignaturasTable
        data={asignaturas}
        carreras={carreras}
        docentes={docentes}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
