import { getEstudiantes } from "@/actions/estudiantes";
import { EstudiantesTable } from "./estudiantes-table";
import { EstudianteDialog } from "./estudiante-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function EstudiantesPage() {
  const estudiantes = await getEstudiantes();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Estudiantes</h1>
          <p className="text-muted-foreground">
            Gestiona los estudiantes de la facultad
          </p>
        </div>
        <EstudianteDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Estudiante
          </Button>
        </EstudianteDialog>
      </div>

      <EstudiantesTable data={estudiantes} />
    </div>
  );
}
