import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { getInscripcionesByUser } from "@/actions/inscripciones";
import { getCursadas } from "@/actions/cursadas";
import { MisCursadasList } from "./mis-cursadas-list";
import { InscripcionDialog } from "./inscripcion-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function MisCursadasPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [inscripciones, todasLasCursadas] = await Promise.all([
    getInscripcionesByUser(session.user.id),
    getCursadas(),
  ]);

  // Filter out cursadas where the student is already enrolled and exams
  const inscripcionCursadaIds = new Set(
    inscripciones.map((i) => i.cursadaId)
  );
  const cursadasDisponibles = todasLasCursadas
    .filter((c) => !inscripcionCursadaIds.has(c.id) && !c.examen)
    .map((c) => ({
      id: c.id,
      startTime: c.startTime,
      durationMinutes: c.durationMinutes,
      daysOfWeek: c.daysOfWeek,
      commissionNumber: c.commissionNumber,
      asignatura: { name: c.asignatura.name },
      carrera: { name: c.carrera.name, color: c.carrera.color },
      aula: { name: c.aula.name, building: c.aula.building },
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mis Cursadas</h1>
          <p className="text-muted-foreground">
            Gestiona tus inscripciones a cursadas
          </p>
        </div>
        <InscripcionDialog
          cursadasDisponibles={cursadasDisponibles}
          userId={session.user.id}
        >
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Inscribirme
          </Button>
        </InscripcionDialog>
      </div>

      <MisCursadasList inscripciones={inscripciones.map((i) => ({
        id: i.id,
        status: i.status,
        cursadaId: i.cursadaId,
        cursada: {
          id: i.cursada.id,
          startTime: i.cursada.startTime,
          durationMinutes: i.cursada.durationMinutes,
          daysOfWeek: i.cursada.daysOfWeek,
          commissionNumber: i.cursada.commissionNumber,
          notes: i.cursada.notes,
          asignatura: { name: i.cursada.asignatura.name },
          carrera: { name: i.cursada.carrera.name, color: i.cursada.carrera.color },
          aula: { name: i.cursada.aula.name, building: i.cursada.aula.building },
          cursadaDocentes: i.cursada.cursadaDocentes.map((cd) => ({
            user: { name: cd.user.name },
          })),
        },
      }))} />
    </div>
  );
}
