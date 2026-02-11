import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { getEstudianteByUserId } from "@/actions/estudiantes";
import { getInscripcionesByEstudiante } from "@/actions/inscripciones";
import { getCursadas } from "@/actions/cursadas";
import { MisCursadasList } from "./mis-cursadas-list";
import { InscripcionDialog } from "./inscripcion-dialog";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MisCursadasPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const estudiante = await getEstudianteByUserId(session.user.id);

  if (!estudiante) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Cursadas</h1>
          <p className="text-muted-foreground">
            Gestiona tus inscripciones a cursadas
          </p>
        </div>

        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <AlertCircle className="h-5 w-5" />
              Cuenta no vinculada
            </CardTitle>
            <CardDescription className="text-yellow-600 dark:text-yellow-400">
              Tu cuenta de usuario no está vinculada a un registro de estudiante.
              Contacta al administrador para vincular tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Email de tu cuenta: <strong>{session.user.email}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [inscripciones, todasLasCursadas] = await Promise.all([
    getInscripcionesByEstudiante(estudiante.id),
    getCursadas(),
  ]);

  // Filter out cursadas where the student is already enrolled
  const inscripcionCursadaIds = new Set(
    inscripciones.map((i) => i.cursadaId)
  );
  const cursadasDisponibles = todasLasCursadas.filter(
    (c) => !inscripcionCursadaIds.has(c.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Cursadas</h1>
          <p className="text-muted-foreground">
            Gestiona tus inscripciones a cursadas
          </p>
        </div>
        <InscripcionDialog
          cursadasDisponibles={cursadasDisponibles}
          estudianteId={estudiante.id}
        >
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Inscribirme
          </Button>
        </InscripcionDialog>
      </div>

      <MisCursadasList inscripciones={inscripciones} />
    </div>
  );
}
