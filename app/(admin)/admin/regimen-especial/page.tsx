import Link from "next/link";
import { BarChart3, Mail } from "lucide-react";
import { getSolicitudesRegimen } from "@/actions/regimen-especial";
import { Button } from "@/components/ui/button";
import { RegimenTable } from "./regimen-table";
import { getPermissions } from "@/lib/auth-server";
import { can } from "@/lib/permissions";

export default async function RegimenEspecialAdminPage() {
  const perms = await getPermissions();
  const solicitudes = await getSolicitudesRegimen();

  const data = solicitudes.map((s) => ({
    id: s.id,
    apellidos: s.apellidos,
    nombres: s.nombres,
    dni: s.dni,
    telefono: s.telefono,
    motivo: s.motivo,
    sede: { name: s.sede.name },
    estado: s.estado,
    observaciones: s.observaciones,
    observacionesRevision: s.observacionesRevision,
    createdAt: s.createdAt,
    reviewedAt: s.reviewedAt,
    carrera: { name: s.carrera.name, color: s.carrera.color },
    user: { name: s.user.name, email: s.user.email },
    asignaturas: s.asignaturas.map((a) => ({
      id: a.id,
      name: a.asignatura.name,
      comisionActual: a.comisionActual,
      comisionDeseada: a.comisionDeseada,
      comisionEstado: a.comisionEstado,
      comisionObservaciones: a.comisionObservaciones,
    })),
    documentos: s.documentos.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      originalName: d.originalName,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Régimen especial
          </h1>
          <p className="text-muted-foreground">
            Solicitudes de inscripción al régimen especial de cursado
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(perms, "regimen", "configurarEmails") && (
            <Button variant="outline" asChild className="w-fit">
              <Link href="/admin/regimen-especial/emails">
                <Mail className="h-4 w-4" />
                Emails
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild className="w-fit">
            <Link href="/admin/regimen-especial/reporte">
              <BarChart3 className="h-4 w-4" />
              Ver informe
            </Link>
          </Button>
        </div>
      </div>

      <RegimenTable
        data={data}
        canDelete={can(perms, "regimen", "delete")}
        canResolverSolicitudes={can(perms, "regimen", "resolverSolicitudes")}
        canResolverCambios={can(perms, "regimen", "resolverCambios")}
      />
    </div>
  );
}
