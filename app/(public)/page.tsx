import { Suspense } from "react";
import { getCursadasByFilters } from "@/actions/cursadas";
import { getCarreras } from "@/actions/carreras";
import { getAulas } from "@/actions/aulas";
import { getAsignaturas } from "@/actions/asignaturas";
import { ClassCard } from "@/components/public/class-card";
import { ClassFilters } from "@/components/public/class-filters";
import { PublicWeeklyView } from "@/components/public/public-weekly-view";
import { AutoScrollGrid } from "@/components/public/auto-scroll-grid";
import { Spinner } from "@/components/ui/spinner";

interface HomePageProps {
  searchParams: Promise<{
    dia?: string;
    carrera?: string;
    aula?: string;
    asignatura?: string;
    vista?: string;
    autoscroll?: string;
  }>;
}

async function CursadasGrid({
  searchParams,
}: {
  searchParams: {
    dia?: string;
    carrera?: string;
    aula?: string;
    asignatura?: string;
    vista?: string;
    autoscroll?: string;
  };
}) {
  const today = new Date().getDay();
  const isSemanal = searchParams.vista === "semanal";

  const filters = {
    dayOfWeek: isSemanal
      ? undefined
      : searchParams.dia
        ? parseInt(searchParams.dia)
        : today,
    carreraId: searchParams.carrera,
    asignaturaId: searchParams.asignatura,
    aulaId: searchParams.aula,
    vista: searchParams.vista,
  };

  const cursadas = (await getCursadasByFilters(filters)).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  if (isSemanal) {
    return <PublicWeeklyView cursadas={cursadas} />;
  }

  if (cursadas.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No se encontraron cursadas con los filtros seleccionados
        </p>
      </div>
    );
  }

  const autoScroll = searchParams.autoscroll === "true";
  const grid = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cursadas.map((cursada, index) => (
        <ClassCard key={cursada.id} cursada={cursada} index={index} />
      ))}
    </div>
  );

  if (autoScroll) {
    return <AutoScrollGrid enabled>{grid}</AutoScrollGrid>;
  }

  return grid;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const [carreras, aulas, asignaturas, resolvedSearchParams] =
    await Promise.all([getCarreras(), getAulas(), getAsignaturas(), searchParams]);

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

  // Simplify asignaturas for filters (only need id, name, carreraId)
  const asignaturasForFilters = asignaturas.map((a) => ({
    id: a.id,
    name: a.name,
    carreraId: a.carrera.id,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cursadas y eventos
          </h1>
          <p className="text-muted-foreground">
            Hoy es {todayName} - Consulta las cursadas disponibles. Si sos
            estudiante, podes registrarte para cargar tus cursadas.
          </p>
        </div>
      </div>

      <ClassFilters
        carreras={carreras}
        aulas={aulas}
        asignaturas={asignaturasForFilters}
        todayDayOfWeek={today}
      />

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
