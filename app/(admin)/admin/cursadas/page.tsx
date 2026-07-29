import { getCursadas } from "@/actions/cursadas";
import { getCarreras } from "@/actions/carreras";
import { getAsignaturas } from "@/actions/asignaturas";
import { getDocentes } from "@/actions/users";
import { getAulas } from "@/actions/aulas";
import { CursadasContent } from "./cursadas-content";
import { getPermissions } from "@/lib/auth-server";
import { can } from "@/lib/permissions";

export default async function CursadasPage() {
  const [perms, cursadas, carreras, asignaturas, docentes, todasLasAulas] =
    await Promise.all([
      getPermissions(),
      getCursadas(),
      getCarreras(),
      getAsignaturas(),
      getDocentes(),
      getAulas(),
    ]);

  // Los permisos de cursadas son por sede: se muestran solo las sedes que el
  // usuario puede ver y se marcan en cuáles puede editar o borrar.
  const sedeIds = [...new Set(todasLasAulas.map((aula) => aula.sedeId))];
  const sedesView = sedeIds.filter((id) => can(perms, "cursadas", "view", id));
  const sedesEdit = sedeIds.filter((id) => can(perms, "cursadas", "edit", id));
  const sedesDelete = sedeIds.filter((id) =>
    can(perms, "cursadas", "delete", id)
  );

  const aulas = todasLasAulas.filter((aula) => sedesView.includes(aula.sedeId));

  return (
    <CursadasContent
      cursadas={cursadas}
      carreras={carreras}
      asignaturas={asignaturas}
      docentes={docentes}
      aulas={aulas}
      sedesEdit={sedesEdit}
      sedesDelete={sedesDelete}
    />
  );
}
