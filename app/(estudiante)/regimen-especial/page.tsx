import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { getMiSolicitudRegimen } from "@/actions/regimen-especial";
import { getCarreras } from "@/actions/carreras";
import { getAsignaturas } from "@/actions/asignaturas";
import { RegimenForm } from "./regimen-form";
import { RegimenEstado } from "./regimen-estado";

export const dynamic = "force-dynamic";

export default async function RegimenEspecialPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const solicitud = await getMiSolicitudRegimen();

  // Con una solicitud pendiente o aprobada solo se muestra el estado.
  const tieneSolicitudActiva =
    solicitud &&
    (solicitud.estado === "pendiente" || solicitud.estado === "aprobada");

  if (tieneSolicitudActiva) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Header />
        <RegimenEstado solicitud={solicitud} />
      </div>
    );
  }

  const [carrerasRaw, asignaturasRaw] = await Promise.all([
    getCarreras(),
    getAsignaturas(),
  ]);

  const carreras = carrerasRaw
    .filter((c) => c.visible)
    .map((c) => ({ id: c.id, name: c.name, color: c.color }));
  const asignaturas = asignaturasRaw
    .filter((a) => a.visible)
    .map((a) => ({ id: a.id, name: a.name, carreraId: a.carreraId }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Header />

      {/* Si la última solicitud fue rechazada, se muestra y se permite reenviar. */}
      {solicitud && solicitud.estado === "rechazada" && (
        <>
          <RegimenEstado solicitud={solicitud} />
          <h2 className="text-lg font-semibold">Enviar una nueva solicitud</h2>
        </>
      )}

      <RegimenForm carreras={carreras} asignaturas={asignaturas} />
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Régimen especial de cursado
      </h1>
      <p className="text-muted-foreground">
        Inscribite para acceder a beneficios y contemplaciones en las reglas de
        cursado. Completá tus datos y adjuntá la documentación requerida.
      </p>
    </div>
  );
}
