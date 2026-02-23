import { getCursadas } from "@/actions/cursadas";
import { getCarreras } from "@/actions/carreras";
import { getAsignaturas } from "@/actions/asignaturas";
import { getDocentes } from "@/actions/users";
import { getAulas } from "@/actions/aulas";
import { CursadasContent } from "./cursadas-content";

export default async function CursadasPage() {
  const [cursadas, carreras, asignaturas, docentes, aulas] = await Promise.all([
    getCursadas(),
    getCarreras(),
    getAsignaturas(),
    getDocentes(),
    getAulas(),
  ]);

  return (
    <CursadasContent
      cursadas={cursadas}
      carreras={carreras}
      asignaturas={asignaturas}
      docentes={docentes}
      aulas={aulas}
    />
  );
}
