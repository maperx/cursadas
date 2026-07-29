import { getAulas } from "@/actions/aulas";
import { getSedes } from "@/actions/sedes";
import { AulasTable } from "./aulas-table";
import { AulaDialog } from "./aula-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function AulasPage() {
  const [aulas, sedesRaw] = await Promise.all([getAulas(), getSedes()]);

  const sedes = sedesRaw.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Aulas</h1>
          <p className="text-muted-foreground">
            Gestiona las aulas de cada sede
          </p>
        </div>
        <AulaDialog sedes={sedes}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Aula
          </Button>
        </AulaDialog>
      </div>

      <AulasTable data={aulas} sedes={sedes} />
    </div>
  );
}
