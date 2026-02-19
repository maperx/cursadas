import { getCarreras } from "@/actions/carreras";
import { CarrerasTable } from "./carreras-table";
import { CarreraDialog } from "./carrera-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function CarrerasPage() {
  const carreras = await getCarreras();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Carreras</h1>
          <p className="text-muted-foreground">
            Gestiona las carreras de la facultad
          </p>
        </div>
        <CarreraDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Carrera
          </Button>
        </CarreraDialog>
      </div>

      <CarrerasTable data={carreras} />
    </div>
  );
}
