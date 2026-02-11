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
import { createAula, updateAula } from "@/actions/aulas";

interface AulaDialogProps {
  children: React.ReactNode;
  aula?: {
    id: string;
    name: string;
    building: string;
    capacity: number | null;
  };
}

export function AulaDialog({ children, aula }: AulaDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const isEditing = !!aula;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const result = isEditing
      ? await updateAula(aula.id, formData)
      : await createAula(formData);

    if (result.error) {
      setErrors(result.error);
      setIsLoading(false);
      return;
    }

    toast({
      title: isEditing ? "Aula actualizada" : "Aula creada",
      description: isEditing
        ? "El aula se ha actualizado correctamente"
        : "El aula se ha creado correctamente",
      variant: "success",
    });

    setIsLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Aula" : "Nueva Aula"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={aula?.name}
              placeholder="Aula 101"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="building">Edificio</Label>
            <Input
              id="building"
              name="building"
              defaultValue={aula?.building}
              placeholder="Edificio A"
              disabled={isLoading}
            />
            {errors.building && (
              <p className="text-sm text-destructive">{errors.building[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacidad (opcional)</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min="1"
              defaultValue={aula?.capacity || ""}
              placeholder="30"
              disabled={isLoading}
            />
            {errors.capacity && (
              <p className="text-sm text-destructive">{errors.capacity[0]}</p>
            )}
          </div>
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
              {isLoading ? <Spinner size="sm" /> : isEditing ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
