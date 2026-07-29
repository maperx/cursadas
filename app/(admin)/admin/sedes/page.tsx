import { getSedesConCarreras } from "@/actions/sedes";
import { getCarreras } from "@/actions/carreras";
import { getAulas } from "@/actions/aulas";
import { SedesTable } from "./sedes-table";
import { SedeDialog } from "./sede-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function SedesPage() {
  const [sedes, carrerasRaw, aulas] = await Promise.all([
    getSedesConCarreras(),
    getCarreras(),
    getAulas(),
  ]);

  const carreras = carrerasRaw.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  const data = sedes.map((sede) => ({
    ...sede,
    aulasCount: aulas.filter((a) => a.sedeId === sede.id).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sedes</h1>
          <p className="text-muted-foreground">
            Gestiona las sedes, sus aulas y las carreras que se dictan en cada una
          </p>
        </div>
        <SedeDialog carreras={carreras}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Sede
          </Button>
        </SedeDialog>
      </div>

      <SedesTable data={data} carreras={carreras} />
    </div>
  );
}
