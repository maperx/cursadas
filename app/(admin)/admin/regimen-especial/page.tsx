import { getSolicitudesRegimen } from "@/actions/regimen-especial";
import { RegimenTable } from "./regimen-table";

export default async function RegimenEspecialAdminPage() {
  const solicitudes = await getSolicitudesRegimen();

  const data = solicitudes.map((s) => ({
    id: s.id,
    apellidos: s.apellidos,
    nombres: s.nombres,
    dni: s.dni,
    telefono: s.telefono,
    motivo: s.motivo,
    sede: s.sede,
    estado: s.estado,
    observaciones: s.observaciones,
    observacionesRevision: s.observacionesRevision,
    createdAt: s.createdAt,
    reviewedAt: s.reviewedAt,
    carrera: { name: s.carrera.name, color: s.carrera.color },
    user: { name: s.user.name, email: s.user.email },
    asignaturas: s.asignaturas.map((a) => ({ name: a.asignatura.name })),
    documentos: s.documentos.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      originalName: d.originalName,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Régimen especial
        </h1>
        <p className="text-muted-foreground">
          Solicitudes de inscripción al régimen especial de cursado
        </p>
      </div>

      <RegimenTable data={data} />
    </div>
  );
}
