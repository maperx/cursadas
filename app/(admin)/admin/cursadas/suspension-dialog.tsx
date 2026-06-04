"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import {
  suspendCursadaRepeticion,
  removeCursadaSuspension,
} from "@/actions/cursadas";

interface SuspensionDialogProps {
  children: React.ReactNode;
  cursadaId: string;
  /** Fecha de la repetición en formato YYYY-MM-DD */
  date: string;
  asignaturaName: string;
  /** Suspensión existente para esta fecha, si la hay */
  suspension?: { observacion: string | null } | null;
}

function formatDateLabel(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function SuspensionDialog({
  children,
  cursadaId,
  date,
  asignaturaName,
  suspension,
}: SuspensionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [observacion, setObservacion] = useState(suspension?.observacion ?? "");

  const isSuspended = !!suspension;

  const handleSuspend = async () => {
    setIsLoading(true);
    const result = await suspendCursadaRepeticion({
      cursadaId,
      date,
      observacion,
    });
    setIsLoading(false);

    if (result.error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la suspensión",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isSuspended ? "Suspensión actualizada" : "Repetición suspendida",
      description: `${asignaturaName} — ${formatDateLabel(date)}`,
      variant: "success",
    });
    setOpen(false);
    router.refresh();
  };

  const handleRemove = async () => {
    setIsLoading(true);
    const result = await removeCursadaSuspension({ cursadaId, date });
    setIsLoading(false);

    if (result.error) {
      toast({
        title: "Error",
        description: "No se pudo quitar la suspensión",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Suspensión quitada",
      description: `${asignaturaName} — ${formatDateLabel(date)}`,
      variant: "success",
    });
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setObservacion(suspension?.observacion ?? "");
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSuspended ? "Repetición suspendida" : "Suspender repetición"}
          </DialogTitle>
          <DialogDescription>
            {asignaturaName} — {formatDateLabel(date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="observacion">Observación (opcional)</Label>
          <Textarea
            id="observacion"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Motivo de la suspensión (ej: paro, feriado puente, docente ausente...)"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Solo se suspende esta fecha. Las demás repeticiones de la cursada no
            se ven afectadas.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {isSuspended && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              disabled={isLoading}
            >
              Quitar suspensión
            </Button>
          )}
          <Button type="button" onClick={handleSuspend} disabled={isLoading}>
            {isLoading ? (
              <Spinner size="sm" />
            ) : isSuspended ? (
              "Actualizar observación"
            ) : (
              "Suspender este día"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
