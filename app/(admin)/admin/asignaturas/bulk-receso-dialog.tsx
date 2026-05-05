"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import { applyBulkReceso } from "@/actions/asignaturas";

interface BulkRecesoDialogProps {
  asignaturaIds: string[];
  onApplied: () => void;
  children: React.ReactNode;
}

export function BulkRecesoDialog({
  asignaturaIds,
  onApplied,
  children,
}: BulkRecesoDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStartDate("");
    setEndDate("");
    setNotes("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!startDate || !endDate) {
      setError("Las fechas son obligatorias");
      return;
    }
    if (startDate > endDate) {
      setError("La fecha de inicio debe ser anterior o igual a la de fin");
      return;
    }

    setIsLoading(true);
    const result = await applyBulkReceso({
      asignaturaIds,
      receso: { startDate, endDate, notes: notes || null },
    });
    setIsLoading(false);

    if ("error" in result) {
      setError("No se pudo aplicar el receso. Revisá los datos.");
      return;
    }

    const replacedMsg =
      result.replaced > 0
        ? ` (${result.replaced} receso(s) previo(s) reemplazado(s))`
        : "";
    toast({
      title: "Receso aplicado",
      description: `Aplicado a ${result.applied} asignatura(s)${replacedMsg}`,
      variant: "success",
    });

    reset();
    setOpen(false);
    onApplied();
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Aplicar receso a {asignaturaIds.length} asignatura(s)
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Si alguna de las asignaturas seleccionadas ya tiene un receso que se
            solapa con estas fechas, será reemplazado.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="bulk-start">Desde</Label>
              <Input
                id="bulk-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bulk-end">Hasta</Label>
              <Input
                id="bulk-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="bulk-notes">Nota (opcional)</Label>
            <Input
              id="bulk-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Receso de invierno..."
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : "Aplicar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
