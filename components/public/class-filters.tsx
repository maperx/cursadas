"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ClassFiltersProps {
  carreras: {
    id: string;
    name: string;
    color: string;
  }[];
  aulas: {
    id: string;
    name: string;
    building: string;
  }[];
}

const DAYS = [
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

export function ClassFilters({ carreras, aulas }: ClassFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDay = searchParams.get("dia") || "";
  const currentCarrera = searchParams.get("carrera") || "";
  const currentAula = searchParams.get("aula") || "";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/");
  };

  const hasFilters = currentDay || currentCarrera || currentAula;

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <Select value={currentDay} onValueChange={(v) => updateFilter("dia", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Día" />
        </SelectTrigger>
        <SelectContent>
          {DAYS.map((day) => (
            <SelectItem key={day.value} value={day.value}>
              {day.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentCarrera}
        onValueChange={(v) => updateFilter("carrera", v)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Carrera" />
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

      <Select value={currentAula} onValueChange={(v) => updateFilter("aula", v)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Aula" />
        </SelectTrigger>
        <SelectContent>
          {aulas.map((aula) => (
            <SelectItem key={aula.id} value={aula.id}>
              {aula.name} - {aula.building}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
