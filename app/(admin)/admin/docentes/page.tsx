import { getDocentes } from "@/actions/docentes";
import { DocentesTable } from "./docentes-table";
import { DocenteDialog } from "./docente-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function DocentesPage() {
  const docentes = await getDocentes();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Docentes</h1>
          <p className="text-muted-foreground">
            Gestiona los docentes de la facultad
          </p>
        </div>
        <DocenteDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Docente
          </Button>
        </DocenteDialog>
      </div>

      <DocentesTable data={docentes} />
    </div>
  );
}
