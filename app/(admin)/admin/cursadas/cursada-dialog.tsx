"use client";

import { useState, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { createCursada, updateCursada } from "@/actions/cursadas";

type Carrera = {
  id: string;
  name: string;
  color: string;
};

type Asignatura = {
  id: string;
  name: string;
  carreraId: string;
};

type Docente = {
  id: string;
  name: string;
  email: string;
};

type Aula = {
  id: string;
  name: string;
  building: string;
  capacity: number | null;
};

interface CursadaDialogProps {
  children: React.ReactNode;
  carreras: Carrera[];
  asignaturas: Asignatura[];
  docentes: Docente[];
  aulas: Aula[];
  cursada?: {
    id: string;
    aulaId: string;
    carreraId: string;
    asignaturaId: string;
    daysOfWeek: number[];
    startTime: string;
    durationMinutes: number;
    notes: string | null;
    weeklyRepetition: boolean;
    commissionNumber: string | null;
    docenteIds: string[];
  };
}

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export function CursadaDialog({
  children,
  carreras,
  asignaturas,
  docentes,
  aulas,
  cursada,
}: CursadaDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [selectedCarrera, setSelectedCarrera] = useState(cursada?.carreraId || "");
  const [selectedAsignatura, setSelectedAsignatura] = useState(cursada?.asignaturaId || "");
  const [selectedAula, setSelectedAula] = useState(cursada?.aulaId || "");
  const [selectedDays, setSelectedDays] = useState<number[]>(cursada?.daysOfWeek || []);
  const [selectedDocentes, setSelectedDocentes] = useState<string[]>(
    cursada?.docenteIds || []
  );
  const [weeklyRepetition, setWeeklyRepetition] = useState(
    cursada?.weeklyRepetition ?? true
  );

  const isEditing = !!cursada;

  // Filter asignaturas by selected carrera
  const filteredAsignaturas = useMemo(() => {
    if (!selectedCarrera) return asignaturas;
    return asignaturas.filter((a) => a.carreraId === selectedCarrera);
  }, [selectedCarrera, asignaturas]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    formData.set("carreraId", selectedCarrera);
    formData.set("asignaturaId", selectedAsignatura);
    formData.set("aulaId", selectedAula);
    formData.set("daysOfWeek", JSON.stringify(selectedDays));
    formData.set("docenteIds", JSON.stringify(selectedDocentes));
    formData.set("weeklyRepetition", weeklyRepetition.toString());

    const result = isEditing
      ? await updateCursada(cursada.id, formData)
      : await createCursada(formData);

    if (result.error) {
      setErrors(result.error);
      setIsLoading(false);
      return;
    }

    toast({
      title: isEditing ? "Cursada actualizada" : "Cursada creada",
      description: isEditing
        ? "La cursada se ha actualizado correctamente"
        : "La cursada se ha creado correctamente",
      variant: "success",
    });

    setIsLoading(false);
    setOpen(false);
    router.refresh();
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Cursada" : "Nueva Cursada"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors._form && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive font-medium">{errors._form[0]}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Carrera</Label>
              <Select
                value={selectedCarrera}
                onValueChange={(value) => {
                  setSelectedCarrera(value);
                  setSelectedAsignatura("");
                }}
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

            <div className="space-y-2">
              <Label>Asignatura</Label>
              <Select
                value={selectedAsignatura}
                onValueChange={setSelectedAsignatura}
                disabled={isLoading || !selectedCarrera}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar asignatura" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAsignaturas.map((asignatura) => (
                    <SelectItem key={asignatura.id} value={asignatura.id}>
                      {asignatura.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.asignaturaId && (
                <p className="text-sm text-destructive">{errors.asignaturaId[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aula</Label>
              <Select
                value={selectedAula}
                onValueChange={setSelectedAula}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar aula" />
                </SelectTrigger>
                <SelectContent>
                  {aulas.map((aula) => (
                    <SelectItem key={aula.id} value={aula.id}>
                      {aula.name} - {aula.building}
                      {aula.capacity && ` (${aula.capacity} pers.)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.aulaId && (
                <p className="text-sm text-destructive">{errors.aulaId[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="commissionNumber">Comisión (opcional)</Label>
              <Input
                id="commissionNumber"
                name="commissionNumber"
                defaultValue={cursada?.commissionNumber || ""}
                placeholder="A, B, 1, 2..."
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Días de la semana</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  variant={selectedDays.includes(day.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(day.value)}
                  disabled={isLoading}
                >
                  {day.label}
                </Button>
              ))}
            </div>
            {errors.daysOfWeek && (
              <p className="text-sm text-destructive">{errors.daysOfWeek[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora de inicio</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={cursada?.startTime || "08:00"}
                disabled={isLoading}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duración (minutos)</Label>
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min="15"
                step="15"
                defaultValue={cursada?.durationMinutes || 90}
                disabled={isLoading}
              />
              {errors.durationMinutes && (
                <p className="text-sm text-destructive">
                  {errors.durationMinutes[0]}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="weeklyRepetition"
              checked={weeklyRepetition}
              onCheckedChange={(checked) =>
                setWeeklyRepetition(checked as boolean)
              }
              disabled={isLoading}
            />
            <label htmlFor="weeklyRepetition" className="text-sm cursor-pointer">
              Se repite semanalmente
            </label>
          </div>

          <div className="space-y-2">
            <Label>Docentes (opcional)</Label>
            <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
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
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={cursada?.notes || ""}
              placeholder="Notas adicionales sobre la cursada..."
              disabled={isLoading}
            />
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
