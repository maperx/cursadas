import { getCarreras } from "@/actions/carreras";
import { getSedes } from "@/actions/sedes";
import { CarrerasTable } from "./carreras-table";
import { CarreraDialog } from "./carrera-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function CarrerasPage() {
  const [carreras, sedesRaw] = await Promise.all([getCarreras(), getSedes()]);

  const sedes = sedesRaw.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Carreras</h1>
          <p className="text-muted-foreground">
            Gestiona las carreras de la facultad y las sedes donde se dictan
          </p>
        </div>
        <CarreraDialog sedes={sedes}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Carrera
          </Button>
        </CarreraDialog>
      </div>

      <CarrerasTable data={carreras} sedes={sedes} />
    </div>
  );
}
