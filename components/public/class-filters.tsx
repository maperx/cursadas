"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, LayoutGrid, CalendarDays, Play, Pause } from "lucide-react";

interface ClassFiltersProps {
  sedes: {
    id: string;
    name: string;
  }[];
  carreras: {
    id: string;
    name: string;
    color: string;
    sedeIds: string[];
  }[];
  aulas: {
    id: string;
    name: string;
    building: string;
    sedeId: string;
  }[];
  asignaturas: {
    id: string;
    name: string;
    carreraId: string;
  }[];
  todayDayOfWeek: number;
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

export function ClassFilters({
  sedes,
  carreras,
  aulas,
  asignaturas,
  todayDayOfWeek,
}: ClassFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDay = searchParams.get("dia") ?? String(todayDayOfWeek);
  const currentSede = searchParams.get("sede") || "";
  const currentCarrera = searchParams.get("carrera") || "";
  const currentAula = searchParams.get("aula") || "";
  const currentAsignatura = searchParams.get("asignatura") || "";
  const currentVista = searchParams.get("vista") || "grilla";
  const isSemanal = currentVista === "semanal";

  // Cada sede tiene sus propias aulas y sus carreras.
  const filteredCarreras = useMemo(() => {
    if (!currentSede) return carreras;
    return carreras.filter((c) => c.sedeIds.includes(currentSede));
  }, [carreras, currentSede]);

  const filteredAulas = useMemo(() => {
    if (!currentSede) return aulas;
    return aulas.filter((a) => a.sedeId === currentSede);
  }, [aulas, currentSede]);

  const filteredAsignaturas = useMemo(() => {
    const base = currentSede
      ? asignaturas.filter((a) =>
          filteredCarreras.some((c) => c.id === a.carreraId)
        )
      : asignaturas;
    if (!currentCarrera) return base;
    return base.filter((a) => a.carreraId === currentCarrera);
  }, [asignaturas, currentCarrera, currentSede, filteredCarreras]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Al cambiar de sede, se descartan los filtros que ya no pertenecen a ella
    if (key === "sede") {
      params.delete("carrera");
      params.delete("asignatura");
      params.delete("aula");
    }
    // If changing carrera, clear asignatura if it no longer belongs
    if (key === "carrera" && currentAsignatura) {
      const stillValid = asignaturas.some(
        (a) => a.id === currentAsignatura && (!value || a.carreraId === value)
      );
      if (!stillValid) {
        params.delete("asignatura");
      }
    }
    router.push(`/?${params.toString()}`);
  };

  const isAutoScroll = searchParams.get("autoscroll") === "true";

  const toggleAutoScroll = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isAutoScroll) {
      params.delete("autoscroll");
    } else {
      params.set("autoscroll", "true");
    }
    router.push(`/?${params.toString()}`);
  };

  const setVista = (vista: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (vista === "semanal") {
      params.set("vista", "semanal");
      params.delete("dia");
      params.delete("autoscroll");
    } else {
      params.delete("vista");
      params.delete("dia");
    }
    router.push(`/?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    if (isSemanal) {
      params.set("vista", "semanal");
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const hasFilters =
    searchParams.get("dia") !== null ||
    currentSede ||
    currentCarrera ||
    currentAula ||
    currentAsignatura ||
    isAutoScroll;

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {/* Vista toggle */}
      <div className="flex rounded-md border">
        <Button
          variant={!isSemanal ? "default" : "ghost"}
          size="sm"
          className="rounded-r-none gap-1.5"
          onClick={() => setVista("grilla")}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Grilla</span>
        </Button>
        <Button
          variant={isSemanal ? "default" : "ghost"}
          size="sm"
          className="rounded-l-none gap-1.5"
          onClick={() => setVista("semanal")}
        >
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">Semanal</span>
        </Button>
      </div>

      {/* Auto-scroll toggle */}
      {!isSemanal && (
        <Button
          variant={isAutoScroll ? "default" : "ghost"}
          size="sm"
          className="gap-1.5"
          onClick={toggleAutoScroll}
          title={isAutoScroll ? "Pausar auto-scroll" : "Auto-scroll"}
        >
          {isAutoScroll ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isAutoScroll ? "Pausar" : "Auto-scroll"}
          </span>
        </Button>
      )}

      {!isSemanal && (
        <Select
          value={currentDay}
          onValueChange={(v) => updateFilter("dia", v)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Dia" />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((day) => (
              <SelectItem key={day.value} value={day.value}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={currentSede} onValueChange={(v) => updateFilter("sede", v)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Sede" />
        </SelectTrigger>
        <SelectContent>
          {sedes.map((sede) => (
            <SelectItem key={sede.id} value={sede.id}>
              {sede.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentCarrera}
        onValueChange={(v) => updateFilter("carrera", v)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Carrera" />
        </SelectTrigger>
        <SelectContent>
          {filteredCarreras.map((carrera) => (
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

      <Select
        value={currentAsignatura}
        onValueChange={(v) => updateFilter("asignatura", v)}
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Asignatura" />
        </SelectTrigger>
        <SelectContent>
          {filteredAsignaturas.map((asignatura) => (
            <SelectItem key={asignatura.id} value={asignatura.id}>
              {asignatura.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentAula}
        onValueChange={(v) => updateFilter("aula", v)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Aula" />
        </SelectTrigger>
        <SelectContent>
          {filteredAulas.map((aula) => (
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
