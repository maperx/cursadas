import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { getCursadasByDocente } from "@/actions/cursadas";
import { MisCatedrasList } from "./mis-catedras-list";

export default async function MisCatedrasPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const cursadas = await getCursadasByDocente(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mis Cátedras</h1>
        <p className="text-muted-foreground">
          Cursadas asignadas a tu cuenta
        </p>
      </div>

      <MisCatedrasList cursadas={cursadas.map((c) => ({
        id: c.id,
        startTime: c.startTime,
        durationMinutes: c.durationMinutes,
        daysOfWeek: c.daysOfWeek,
        commissionNumber: c.commissionNumber,
        notes: c.notes,
        asignatura: { name: c.asignatura.name },
        carrera: { name: c.carrera.name, color: c.carrera.color },
        aula: { name: c.aula.name, building: c.aula.building },
        cursadaDocentes: c.cursadaDocentes.map((cd) => ({
          user: { id: cd.user.id, name: cd.user.name },
        })),
      }))} currentUserId={session.user.id} />
    </div>
  );
}
