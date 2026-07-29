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
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import { createCarrera, updateCarrera } from "@/actions/carreras";

type Sede = {
  id: string;
  name: string;
};

interface CarreraDialogProps {
  children: React.ReactNode;
  sedes: Sede[];
  carrera?: {
    id: string;
    name: string;
    color: string;
    visible: boolean;
    sedeIds: string[];
  };
}

export function CarreraDialog({ children, sedes, carrera }: CarreraDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [color, setColor] = useState(carrera?.color || "#3B82F6");
  const [visible, setVisible] = useState(carrera?.visible ?? true);
  const [selectedSedes, setSelectedSedes] = useState<string[]>(
    carrera?.sedeIds ?? []
  );

  const toggleSede = (sedeId: string) => {
    setSelectedSedes((prev) =>
      prev.includes(sedeId)
        ? prev.filter((id) => id !== sedeId)
        : [...prev, sedeId]
    );
  };

  const isEditing = !!carrera;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    formData.set("sedeIds", JSON.stringify(selectedSedes));
    const result = isEditing
      ? await updateCarrera(carrera.id, formData)
      : await createCarrera(formData);

    if (result.error) {
      setErrors(result.error);
      setIsLoading(false);
      return;
    }

    toast({
      title: isEditing ? "Carrera actualizada" : "Carrera creada",
      description: isEditing
        ? "La carrera se ha actualizado correctamente"
        : "La carrera se ha creado correctamente",
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
            {isEditing ? "Editar Carrera" : "Nueva Carrera"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={carrera?.name}
              placeholder="Ingeniería en Sistemas"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                name="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-9 p-1"
                disabled={isLoading}
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1"
                placeholder="#3B82F6"
              />
            </div>
            {errors.color && (
              <p className="text-sm text-destructive">{errors.color[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Sedes en las que se dicta</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
              {sedes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay sedes cargadas
                </p>
              ) : (
                sedes.map((sede) => (
                  <div key={sede.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`sede-${sede.id}`}
                      checked={selectedSedes.includes(sede.id)}
                      onCheckedChange={() => toggleSede(sede.id)}
                      disabled={isLoading}
                    />
                    <label
                      htmlFor={`sede-${sede.id}`}
                      className="cursor-pointer text-sm"
                    >
                      {sede.name}
                    </label>
                  </div>
                ))
              )}
            </div>
            {errors.sedeIds && (
              <p className="text-sm text-destructive">{errors.sedeIds[0]}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="hidden" name="visible" value={visible ? "true" : "false"} />
            <Checkbox
              id="visible"
              checked={visible}
              onCheckedChange={(checked) => setVisible(checked === true)}
              disabled={isLoading}
            />
            <Label htmlFor="visible" className="cursor-pointer">
              Visible en página pública
            </Label>
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
