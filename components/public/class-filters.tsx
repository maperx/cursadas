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
import { X, LayoutGrid, CalendarDays, BookOpen, FileText, Play, Pause } from "lucide-react";

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
  asignaturas: {
    id: string;
    name: string;
    carreraId: string;
  }[];
  todayDayOfWeek: number;
  hasExamenes: boolean;
  defaultTipo: string;
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
  carreras,
  aulas,
  asignaturas,
  todayDayOfWeek,
  hasExamenes,
  defaultTipo,
}: ClassFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDay = searchParams.get("dia") ?? String(todayDayOfWeek);
  const currentCarrera = searchParams.get("carrera") || "";
  const currentAula = searchParams.get("aula") || "";
  const currentAsignatura = searchParams.get("asignatura") || "";
  const currentVista = searchParams.get("vista") || "grilla";
  const isSemanal = currentVista === "semanal";
  const currentTipo = searchParams.get("tipo") ?? defaultTipo;

  const filteredAsignaturas = useMemo(() => {
    if (!currentCarrera) return asignaturas;
    return asignaturas.filter((a) => a.carreraId === currentCarrera);
  }, [asignaturas, currentCarrera]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
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
    // If changing day, clear tipo so auto-detection kicks in
    if (key === "dia") {
      params.delete("tipo");
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
    params.delete("tipo");
    router.push(`/?${params.toString()}`);
  };

  const setTipo = (tipo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tipo", tipo);
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
    currentCarrera ||
    currentAula ||
    currentAsignatura ||
    searchParams.get("tipo") !== null ||
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

      {/* Tipo toggle */}
      {hasExamenes && (
        <div className="flex rounded-md border">
          <Button
            variant={currentTipo === "cursadas" ? "default" : "ghost"}
            size="sm"
            className="rounded-r-none gap-1.5"
            onClick={() => setTipo("cursadas")}
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Cursadas</span>
          </Button>
          <Button
            variant={currentTipo === "examenes" ? "default" : "ghost"}
            size="sm"
            className="rounded-l-none gap-1.5"
            onClick={() => setTipo("examenes")}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Eventos</span>
          </Button>
        </div>
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

      <Select
        value={currentCarrera}
        onValueChange={(v) => updateFilter("carrera", v)}
      >
        <SelectTrigger className="w-full sm:w-48">
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
