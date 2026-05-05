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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { createAsignatura, updateAsignatura } from "@/actions/asignaturas";

type Carrera = {
  id: string;
  name: string;
  color: string;
};

type Docente = {
  id: string;
  name: string;
  email: string;
};

type RecesoInput = {
  startDate: string;
  endDate: string;
  notes: string | null;
};

interface AsignaturaDialogProps {
  children: React.ReactNode;
  carreras: Carrera[];
  docentes: Docente[];
  asignatura?: {
    id: string;
    name: string;
    carreraId: string;
    startDate: string | null;
    endDate: string | null;
    visible: boolean;
    docenteIds: string[];
    recesos: RecesoInput[];
  };
}

export function AsignaturaDialog({
  children,
  carreras,
  docentes,
  asignatura,
}: AsignaturaDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [selectedCarrera, setSelectedCarrera] = useState(asignatura?.carreraId || "");
  const [visible, setVisible] = useState(asignatura?.visible ?? true);
  const [selectedDocentes, setSelectedDocentes] = useState<string[]>(
    asignatura?.docenteIds || []
  );
  const [recesos, setRecesos] = useState<RecesoInput[]>(
    asignatura?.recesos || []
  );

  const isEditing = !!asignatura;

  const addReceso = () => {
    setRecesos((prev) => [...prev, { startDate: "", endDate: "", notes: "" }]);
  };

  const removeReceso = (index: number) => {
    setRecesos((prev) => prev.filter((_, i) => i !== index));
  };

  const updateReceso = (index: number, field: keyof RecesoInput, value: string) => {
    setRecesos((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    formData.set("carreraId", selectedCarrera);
    formData.set("visible", visible ? "true" : "false");
    formData.set("docenteIds", JSON.stringify(selectedDocentes));
    const cleanRecesos = recesos
      .filter((r) => r.startDate && r.endDate)
      .map((r) => ({
        startDate: r.startDate,
        endDate: r.endDate,
        notes: r.notes || null,
      }));
    formData.set("recesos", JSON.stringify(cleanRecesos));

    const result = isEditing
      ? await updateAsignatura(asignatura.id, formData)
      : await createAsignatura(formData);

    if (result.error) {
      setErrors(result.error);
      setIsLoading(false);
      return;
    }

    toast({
      title: isEditing ? "Asignatura actualizada" : "Asignatura creada",
      description: isEditing
        ? "La asignatura se ha actualizado correctamente"
        : "La asignatura se ha creado correctamente",
      variant: "success",
    });

    setIsLoading(false);
    setOpen(false);
    router.refresh();
  };

  const toggleDocente = (docenteId: string) => {
    setSelectedDocentes((prev) =>
      prev.includes(docenteId)
        ? prev.filter((id) => id !== docenteId)
        : [...prev, docenteId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Asignatura" : "Nueva Asignatura"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={asignatura?.name}
              placeholder="Programación I"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Carrera</Label>
            <Select
              value={selectedCarrera}
              onValueChange={setSelectedCarrera}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar carrera" />
              </SelectTrigger>
              <SelectContent>
                {carreras.map((carrera) => (
                  <SelectItem key={carrera.id} value={carrera.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: carrera.color }}
                      />
                      {carrera.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.carreraId && (
              <p className="text-sm text-destructive">{errors.carreraId[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha inicio (opcional)</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={asignatura?.startDate || ""}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha fin (opcional)</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={asignatura?.endDate || ""}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Docentes (opcional)</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
              {docentes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay docentes disponibles
                </p>
              ) : (
                docentes.map((docente) => (
                  <div key={docente.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`docente-${docente.id}`}
                      checked={selectedDocentes.includes(docente.id)}
                      onCheckedChange={() => toggleDocente(docente.id)}
                      disabled={isLoading}
                    />
                    <label
                      htmlFor={`docente-${docente.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {docente.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Periodos de receso (opcional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addReceso}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Durante estos periodos no se mostrará el cursado semanal. Útil
              para vacaciones o semanas de exámenes.
            </p>
            {recesos.length === 0 ? (
              <p className="text-sm text-muted-foreground border rounded-md p-3 text-center">
                Sin periodos de receso
              </p>
            ) : (
              <div className="space-y-2">
                {recesos.map((receso, index) => (
                  <div
                    key={index}
                    className="border rounded-md p-3 space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Desde</Label>
                        <Input
                          type="date"
                          value={receso.startDate}
                          onChange={(e) =>
                            updateReceso(index, "startDate", e.target.value)
                          }
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Hasta</Label>
                        <Input
                          type="date"
                          value={receso.endDate}
                          onChange={(e) =>
                            updateReceso(index, "endDate", e.target.value)
                          }
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Nota (opcional)</Label>
                        <Input
                          value={receso.notes || ""}
                          onChange={(e) =>
                            updateReceso(index, "notes", e.target.value)
                          }
                          placeholder="Receso de invierno..."
                          disabled={isLoading}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeReceso(index)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {errors.recesos && (
              <p className="text-sm text-destructive">{errors.recesos[0]}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
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
