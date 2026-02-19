import { getInscripciones } from "@/actions/inscripciones";
import { InscripcionesTable } from "./inscripciones-table";

export default async function InscripcionesPage() {
  const inscripciones = await getInscripciones();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inscripciones</h1>
        <p className="text-muted-foreground">
          Ver las inscripciones de estudiantes a cursadas
        </p>
      </div>

      <InscripcionesTable data={inscripciones} />
    </div>
  );
}
