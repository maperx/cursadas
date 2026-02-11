import { Suspense } from "react";
import { getCursadasByFilters } from "@/actions/cursadas";
import { getCarreras } from "@/actions/carreras";
import { getAulas } from "@/actions/aulas";
import { ClassCard } from "@/components/public/class-card";
import { ClassFilters } from "@/components/public/class-filters";
import { Spinner } from "@/components/ui/spinner";

interface HomePageProps {
  searchParams: Promise<{
    dia?: string;
    carrera?: string;
    aula?: string;
  }>;
}

async function CursadasGrid({
  searchParams,
}: {
  searchParams: { dia?: string; carrera?: string; aula?: string };
}) {
  const filters = {
    dayOfWeek: searchParams.dia ? parseInt(searchParams.dia) : undefined,
    carreraId: searchParams.carrera,
    aulaId: searchParams.aula,
  };

  const cursadas = (await getCursadasByFilters(filters)).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  if (cursadas.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No se encontraron cursadas con los filtros seleccionados
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cursadas.map((cursada, index) => (
        <ClassCard key={cursada.id} cursada={cursada} index={index} />
      ))}
    </div>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const [carreras, aulas, resolvedSearchParams] = await Promise.all([
    getCarreras(),
    getAulas(),
    searchParams,
  ]);

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const today = new Date().getDay();
  const todayName = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ][today];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Cursadas del Día
        </h1>
        <p className="text-muted-foreground">
          Hoy es {todayName} - Consulta las cursadas disponibles
        </p>
      </div>

      <ClassFilters carreras={carreras} aulas={aulas} />

      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        }
      >
        <CursadasGrid searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
