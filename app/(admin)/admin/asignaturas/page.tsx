import { getAsignaturas } from "@/actions/asignaturas";
import { getCarreras } from "@/actions/carreras";
import { getDocentes } from "@/actions/docentes";
import { AsignaturasTable } from "./asignaturas-table";
import { AsignaturaDialog } from "./asignatura-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function AsignaturasPage() {
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
        <AsignaturaDialog carreras={carreras} docentes={docentes}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Asignatura
          </Button>
        </AsignaturaDialog>
      </div>

      <AsignaturasTable data={asignaturas} carreras={carreras} docentes={docentes} />
    </div>
  );
}
