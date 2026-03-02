"use client";

import { useMemo, useState } from "react";
import { CursadasHeader } from "./cursadas-header";
import { CursadasTable } from "./cursadas-table";
import { CursadasWeekly } from "./cursadas-weekly";
import { CursadasDaily } from "./cursadas-daily";
import { CursadasAulas } from "./cursadas-aulas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type Cursada = {
  id: string;
  aulaId: string;
  carreraId: string;
  asignaturaId: string;
  daysOfWeek: number[];
  startTime: string;
  durationMinutes: number;
  notes: string | null;
  weeklyRepetition: boolean;
  eventDate: string | null;
  commissionNumber: string | null;
  examen: boolean;
  createdAt: Date;
  updatedAt: Date;
  aula: Aula;
  carrera: Carrera;
  asignatura: { id: string; name: string; startDate: string | null; endDate: string | null };
  cursadaDocentes: {
    user: Docente;
  }[];
};

export type ViewMode = "table" | "weekly" | "daily" | "aulas";

interface CursadasContentProps {
  cursadas: Cursada[];
  carreras: Carrera[];
  asignaturas: Asignatura[];
  docentes: Docente[];
  aulas: Aula[];
}

export function CursadasContent({
  cursadas,
  carreras,
  asignaturas,
  docentes,
  aulas,
}: CursadasContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [filterCarrera, setFilterCarrera] = useState<string>("all");
  const [filterAula, setFilterAula] = useState<string>("all");
  const [filterExamen, setFilterExamen] = useState<string>("all");

  const filteredCursadas = useMemo(() => {
    return cursadas.filter((c) => {
      if (filterCarrera !== "all" && c.carrera.name !== filterCarrera) return false;
      if (filterAula !== "all" && c.aula.name !== filterAula) return false;
      if (filterExamen === "examen" && !c.examen) return false;
      if (filterExamen === "cursada" && c.examen) return false;
      return true;
    });
  }, [cursadas, filterCarrera, filterAula, filterExamen]);

  return (
    <div className="space-y-6">
      <CursadasHeader
        carreras={carreras}
        asignaturas={asignaturas}
        docentes={docentes}
        aulas={aulas}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterCarrera} onValueChange={setFilterCarrera}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todas las carreras" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las carreras</SelectItem>
            {carreras.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAula} onValueChange={setFilterAula}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todas las aulas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las aulas</SelectItem>
            {aulas.map((a) => (
              <SelectItem key={a.id} value={a.name}>
                {a.name} ({a.building})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterExamen} onValueChange={setFilterExamen}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Cursadas y exámenes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cursadas y exámenes</SelectItem>
            <SelectItem value="cursada">Solo cursadas</SelectItem>
            <SelectItem value="examen">Solo exámenes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {viewMode === "table" && (
        <CursadasTable
          data={filteredCursadas}
          carreras={carreras}
          asignaturas={asignaturas}
          docentes={docentes}
          aulas={aulas}
        />
      )}
      {viewMode === "weekly" && (
        <CursadasWeekly
          data={filteredCursadas}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          carreras={carreras}
          asignaturas={asignaturas}
          docentes={docentes}
          aulas={aulas}
        />
      )}
      {viewMode === "daily" && (
        <CursadasDaily
          data={filteredCursadas}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          carreras={carreras}
          asignaturas={asignaturas}
          docentes={docentes}
          aulas={aulas}
        />
      )}
      {viewMode === "aulas" && (
        <CursadasAulas
          data={filteredCursadas}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          carreras={carreras}
          asignaturas={asignaturas}
          docentes={docentes}
          aulas={aulas}
        />
      )}
    </div>
  );
}
