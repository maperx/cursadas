import { getCursadas } from "@/actions/cursadas";
import { getCarreras } from "@/actions/carreras";
import { getAsignaturas } from "@/actions/asignaturas";
import { getDocentes } from "@/actions/docentes";
import { getAulas } from "@/actions/aulas";
import { CursadasTable } from "./cursadas-table";
import { CursadasHeader } from "./cursadas-header";

export default async function CursadasPage() {
  const [cursadas, carreras, asignaturas, docentes, aulas] = await Promise.all([
    getCursadas(),
    getCarreras(),
    getAsignaturas(),
    getDocentes(),
    getAulas(),
  ]);

  return (
    <div className="space-y-6">
      <CursadasHeader
        carreras={carreras}
        asignaturas={asignaturas}
        docentes={docentes}
        aulas={aulas}
      />

      <CursadasTable
        data={cursadas}
        carreras={carreras}
        asignaturas={asignaturas}
        docentes={docentes}
        aulas={aulas}
      />
    </div>
  );
}
