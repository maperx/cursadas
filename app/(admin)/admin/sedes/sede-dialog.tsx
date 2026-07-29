"use client";

import { useMemo, useState } from "react";
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
import { createSede, updateSede } from "@/actions/sedes";

type Carrera = {
  id: string;
  name: string;
  color: string;
};

interface SedeDialogProps {
  children: React.ReactNode;
  carreras: Carrera[];
  sede?: {
    id: string;
    name: string;
    address: string | null;
    visible: boolean;
    carreras: { id: string }[];
  };
}

export function SedeDialog({ children, carreras, sede }: SedeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [visible, setVisible] = useState(sede?.visible ?? true);
  const [selectedCarreras, setSelectedCarreras] = useState<string[]>(
    sede?.carreras.map((c) => c.id) ?? []
  );
  const [carreraFilter, setCarreraFilter] = useState("");

  const isEditing = !!sede;

  const filteredCarreras = useMemo(() => {
    if (!carreraFilter) return carreras;
    const lower = carreraFilter.toLowerCase();
    return carreras.filter((c) => c.name.toLowerCase().includes(lower));
  }, [carreraFilter, carreras]);

  const toggleCarrera = (carreraId: string) => {
    setSelectedCarreras((prev) =>
      prev.includes(carreraId)
        ? prev.filter((id) => id !== carreraId)
        : [...prev, carreraId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    formData.set("carreraIds", JSON.stringify(selectedCarreras));

    const result = isEditing
      ? await updateSede(sede.id, formData)
      : await createSede(formData);

    if (result.error) {
      setErrors(result.error);
      setIsLoading(false);
      return;
    }

    toast({
      title: isEditing ? "Sede actualizada" : "Sede creada",
      description: isEditing
        ? "La sede se ha actualizado correctamente"
        : "La sede se ha creado correctamente",
      variant: "success",
    });

    setIsLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setCarreraFilter("");
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Sede" : "Nueva Sede"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={sede?.name}
              placeholder="Paraná"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección (opcional)</Label>
            <Input
              id="address"
              name="address"
              defaultValue={sede?.address ?? ""}
              placeholder="Av. Ramírez 1143"
              disabled={isLoading}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Carreras que se dictan en esta sede</Label>
            <Input
              placeholder="Buscar carrera..."
              value={carreraFilter}
              onChange={(e) => setCarreraFilter(e.target.value)}
              disabled={isLoading}
            />
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
              {carreras.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay carreras cargadas
                </p>
              ) : filteredCarreras.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No se encontraron carreras
                </p>
              ) : (
                filteredCarreras.map((carrera) => (
                  <div key={carrera.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`carrera-${carrera.id}`}
                      checked={selectedCarreras.includes(carrera.id)}
                      onCheckedChange={() => toggleCarrera(carrera.id)}
                      disabled={isLoading}
                    />
                    <label
                      htmlFor={`carrera-${carrera.id}`}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: carrera.color }}
                      />
                      {carrera.name}
                    </label>
                  </div>
                ))
              )}
            </div>
            {errors.carreraIds && (
              <p className="text-sm text-destructive">{errors.carreraIds[0]}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="hidden"
              name="visible"
              value={visible ? "true" : "false"}
            />
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
