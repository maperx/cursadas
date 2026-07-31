import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRegimenEmailPlantillas } from "@/actions/regimen-especial";
import { Button } from "@/components/ui/button";
import { PlantillaForm } from "./plantilla-form";

export default async function RegimenEmailsPage() {
  const plantillas = await getRegimenEmailPlantillas();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Emails del régimen especial
          </h1>
          <p className="text-muted-foreground">
            Texto y archivo adjunto de los avisos automáticos al estudiante
          </p>
        </div>
        <Button variant="outline" asChild className="w-fit">
          <Link href="/admin/regimen-especial">
            <ArrowLeft className="h-4 w-4" />
            Volver a las solicitudes
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {plantillas.map((p) => (
          <PlantillaForm
            key={p.tipo}
            plantilla={{
              tipo: p.tipo,
              asunto: p.asunto,
              cuerpo: p.cuerpo,
              activo: p.activo,
              adjunto: p.adjunto,
              configurada: p.configurada,
            }}
          />
        ))}
      </div>
    </div>
  );
}
