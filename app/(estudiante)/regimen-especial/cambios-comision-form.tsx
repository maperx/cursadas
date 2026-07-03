"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, Lock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { updateCambiosComision } from "@/actions/regimen-especial";
import {
  CAMBIO_ESTADO_LABELS,
  type RegimenCambioEstado,
} from "@/lib/regimen-especial";

type AsignaturaCambio = {
  asignaturaId: string;
  nombre: string;
  comisionActual: string | null;
  comisionDeseada: string | null;
};

interface CambiosComisionFormProps {
  solicitudId: string;
  estado: RegimenCambioEstado;
  asignaturas: AsignaturaCambio[];
}

export function CambiosComisionForm({
  solicitudId,
  estado,
  asignaturas,
}: CambiosComisionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<AsignaturaCambio[]>(asignaturas);

  const bloqueado = estado === "aprobado";

  const setValue = (
    asignaturaId: string,
    field: "comisionActual" | "comisionDeseada",
    value: string
  ) =>
    setRows((prev) =>
      prev.map((r) =>
        r.asignaturaId === asignaturaId ? { ...r, [field]: value } : r
      )
    );

  const handleSave = async () => {
    setIsLoading(true);
    const result = await updateCambiosComision({
      solicitudId,
      cambios: rows.map((r) => ({
        asignaturaId: r.asignaturaId,
        comisionActual: r.comisionActual,
        comisionDeseada: r.comisionDeseada,
      })),
    });
    setIsLoading(false);

    if (result.error) {
      toast({
        title: "No se pudo guardar",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Cambios guardados",
      description:
        "Quedaron registrados. Un administrador debe aprobarlos para confirmarlos.",
      variant: "success",
    });
    router.refresh();
  };

  return (
    <div className="space-y-4 rounded-lg border p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Cambio de comisión</h2>
          <p className="text-sm text-muted-foreground">
            Indicá, si corresponde, en qué comisión estás inscripto en cada
            asignatura y a cuál te querés cambiar.
          </p>
        </div>
        <Badge variant={bloqueado ? "success" : "warning"}>
          {CAMBIO_ESTADO_LABELS[estado]}
        </Badge>
      </div>

      {bloqueado && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          Los cambios de comisión fueron aprobados y ya no pueden modificarse.
        </div>
      )}

      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.asignaturaId}
            className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_auto_1fr]"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{row.nombre}</p>
              <p className="text-xs text-muted-foreground">Comisión actual</p>
              <Input
                value={row.comisionActual ?? ""}
                onChange={(e) =>
                  setValue(row.asignaturaId, "comisionActual", e.target.value)
                }
                placeholder="Ej: 1"
                disabled={bloqueado || isLoading}
              />
            </div>

            <div className="hidden items-end justify-center pb-2 text-muted-foreground sm:flex">
              <ArrowRight className="h-4 w-4" />
            </div>

            <div className="space-y-1 sm:pt-[1.375rem]">
              <p className="text-xs text-muted-foreground">Cambiar a</p>
              <Input
                value={row.comisionDeseada ?? ""}
                onChange={(e) =>
                  setValue(row.asignaturaId, "comisionDeseada", e.target.value)
                }
                placeholder="Ej: 3"
                disabled={bloqueado || isLoading}
              />
            </div>
          </div>
        ))}
      </div>

      {!bloqueado && (
        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : "Guardar cambios"}
          </Button>
        </div>
      )}
    </div>
  );
}
