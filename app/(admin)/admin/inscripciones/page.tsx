import { getInscripciones } from "@/actions/inscripciones";
import { InscripcionesTable } from "./inscripciones-table";
import { getPermissions } from "@/lib/auth-server";
import { can } from "@/lib/permissions";

export default async function InscripcionesPage() {
  const perms = await getPermissions();
  const inscripciones = await getInscripciones();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inscripciones</h1>
        <p className="text-muted-foreground">
          Ver las inscripciones de estudiantes a cursadas
        </p>
      </div>

      <InscripcionesTable
        data={inscripciones}
        canDelete={can(perms, "inscripciones", "delete")}
      />
    </div>
  );
}
