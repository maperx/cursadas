import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getReporteCambiosComision } from "@/actions/regimen-especial";
import { Button } from "@/components/ui/button";
import { ReporteView } from "./reporte-view";

export default async function ReporteCambiosComisionPage() {
  const data = await getReporteCambiosComision();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href="/admin/regimen-especial">
            <ArrowLeft className="h-4 w-4" />
            Volver a solicitudes
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Informe de cambios de comisión
          </h1>
          <p className="text-muted-foreground">
            Estudiantes que migran de comisión, agrupados por carrera y
            asignatura
          </p>
        </div>
      </div>

      <ReporteView data={data} />
    </div>
  );
}
