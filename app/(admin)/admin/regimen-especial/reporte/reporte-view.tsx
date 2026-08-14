import {
  ArrowRight,
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ReporteCambiosComision } from "@/actions/regimen-especial";

// Cuántas asignaturas se dibujan en el gráfico (el detalle completo está en la
// tabla de abajo). Las demás se resumen en una nota para no truncar en silencio.
const MAX_ASIGNATURAS_CHART = 10;

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className={cn("h-4 w-4 shrink-0", accent)} />
        </div>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function BarRow({
  label,
  sub,
  value,
  max,
  color,
}: {
  label: string;
  sub?: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div title={`${label}: ${value} estudiante${value === 1 ? "" : "s"}`}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {value}
        </span>
      </div>
      {sub && (
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      )}
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            minWidth: value > 0 ? "0.375rem" : 0,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function EstadoSplit({
  aprobados,
  rechazados,
  pendientes,
}: {
  aprobados: number;
  rechazados: number;
  pendientes: number;
}) {
  const total = aprobados + rechazados + pendientes;
  const tramos = [
    { label: "Aprobados", value: aprobados, color: "bg-green-500" },
    { label: "Rechazados", value: rechazados, color: "bg-destructive" },
    { label: "Pendientes", value: pendientes, color: "bg-yellow-500" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {tramos.map(
          (t) =>
            t.value > 0 && (
              <div
                key={t.label}
                className={t.color}
                style={{ width: `${(t.value / total) * 100}%` }}
                title={`${t.label}: ${t.value}`}
              />
            )
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {tramos.map((t) => (
          <span key={t.label} className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", t.color)} />
            {t.label}
            <span className="font-semibold tabular-nums">{t.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ReporteView({ data }: { data: ReporteCambiosComision }) {
  const { totals, porCarrera, porAsignatura } = data;

  if (totals.estudiantes === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Todavía no hay cambios de comisión</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Cuando los estudiantes con solicitud aprobada carguen cambios de
            comisión, vas a ver acá el resumen por carrera y asignatura.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCarrera = Math.max(...porCarrera.map((c) => c.estudiantes));
  const asignaturasChart = porAsignatura.slice(0, MAX_ASIGNATURAS_CHART);
  const asignaturasOcultas = porAsignatura.length - asignaturasChart.length;
  const maxAsignatura = Math.max(...porAsignatura.map((a) => a.estudiantes));

  return (
    <div className="space-y-6">
      {/* Resumen general */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile
          label="Estudiantes que migran"
          value={totals.estudiantes}
          icon={Users}
          accent="text-blue-500"
        />
        <StatTile
          label="Cambios de comisión"
          value={totals.cambios}
          icon={ArrowRightLeft}
          accent="text-violet-500"
        />
        <StatTile
          label="Aprobados"
          value={totals.aprobados}
          icon={CheckCircle2}
          accent="text-green-500"
        />
        <StatTile
          label="Rechazados"
          value={totals.rechazados}
          icon={XCircle}
          accent="text-destructive"
        />
        <StatTile
          label="Pendientes"
          value={totals.pendientes}
          icon={Clock}
          accent="text-yellow-500"
        />
      </div>

      {/* Estado de los cambios */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estado de los cambios</CardTitle>
          <CardDescription>
            {totals.cambios} cambios de {totals.estudiantes} estudiantes en{" "}
            {totals.carreras}{" "}
            {totals.carreras === 1 ? "carrera" : "carreras"} y{" "}
            {totals.asignaturas}{" "}
            {totals.asignaturas === 1 ? "asignatura" : "asignaturas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EstadoSplit
            aprobados={totals.aprobados}
            rechazados={totals.rechazados}
            pendientes={totals.pendientes}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Por carrera */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              Estudiantes que migran por carrera
            </CardTitle>
            <CardDescription>
              Cantidad de estudiantes con al menos un cambio de comisión.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {porCarrera.map((c) => (
              <BarRow
                key={c.carreraId}
                label={c.carrera}
                sub={`${c.cambios} ${
                  c.cambios === 1 ? "cambio" : "cambios"
                } · ${c.aprobados} aprob. · ${c.rechazados} rech. · ${
                  c.pendientes
                } pend.`}
                value={c.estudiantes}
                max={maxCarrera}
                color={c.color}
              />
            ))}
          </CardContent>
        </Card>

        {/* Por asignatura */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Asignaturas con más migraciones
            </CardTitle>
            <CardDescription>
              Estudiantes que se cambian de comisión en cada asignatura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {asignaturasChart.map((a) => (
              <BarRow
                key={a.asignaturaId}
                label={a.asignatura}
                sub={a.carrera}
                value={a.estudiantes}
                max={maxAsignatura}
                color={a.color}
              />
            ))}
            {asignaturasOcultas > 0 && (
              <p className="pt-1 text-xs text-muted-foreground">
                +{asignaturasOcultas}{" "}
                {asignaturasOcultas === 1
                  ? "asignatura más"
                  : "asignaturas más"}{" "}
                en el detalle de abajo.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalle de migraciones</CardTitle>
          <CardDescription>
            Cambios de comisión (origen → destino) por asignatura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asignatura</TableHead>
                <TableHead className="text-right">Estud.</TableHead>
                <TableHead className="text-right">Aprob.</TableHead>
                <TableHead className="text-right">Rech.</TableHead>
                <TableHead className="text-right">Pend.</TableHead>
                <TableHead>Migraciones (origen → destino)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porAsignatura.map((a) => (
                <TableRow key={a.asignaturaId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: a.color }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium">{a.asignatura}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.carrera}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {a.estudiantes}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-green-600 dark:text-green-500">
                    {a.aprobados}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">
                    {a.rechazados}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-yellow-600 dark:text-yellow-500">
                    {a.pendientes}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {a.flujos.map((f, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-xs"
                        >
                          <span className="tabular-nums">{f.desde}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="tabular-nums">{f.hacia}</span>
                          <span className="text-muted-foreground">
                            ×{f.count}
                          </span>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
