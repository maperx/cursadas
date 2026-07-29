"use client";

import { useCallback, useMemo, useState } from "react";
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

// La lista para elegir carrera necesita saber en qué sedes se dicta cada una.
type CarreraOption = Carrera & { sedeIds: string[] };

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
  sedeId: string;
  sede: { id: string; name: string };
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
  suspensiones: { date: string; observacion: string | null }[];
};

export type ViewMode = "table" | "weekly" | "daily" | "aulas";

interface CursadasContentProps {
  cursadas: Cursada[];
  carreras: CarreraOption[];
  asignaturas: Asignatura[];
  docentes: Docente[];
  aulas: Aula[];
  /** Sedes donde el usuario puede editar cursadas. */
  sedesEdit: string[];
  /** Sedes donde el usuario puede borrar cursadas. */
  sedesDelete: string[];
}

export function CursadasContent({
  cursadas,
  carreras,
  asignaturas,
  docentes,
  aulas,
  sedesEdit,
  sedesDelete,
}: CursadasContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [filterSede, setFilterSede] = useState<string>("all");
  const [filterCarrera, setFilterCarrera] = useState<string>("all");
  const [filterAula, setFilterAula] = useState<string>("all");
  const [filterExamen, setFilterExamen] = useState<string>("all");

  const editables = useMemo(() => new Set(sedesEdit), [sedesEdit]);
  const borrables = useMemo(() => new Set(sedesDelete), [sedesDelete]);
  const canEdit = useCallback(
    (sedeId: string) => editables.has(sedeId),
    [editables]
  );
  const canDelete = useCallback(
    (sedeId: string) => borrables.has(sedeId),
    [borrables]
  );

  // El diálogo de alta/edición solo puede ofrecer aulas de sedes editables.
  const aulasEditables = useMemo(
    () => aulas.filter((aula) => editables.has(aula.sedeId)),
    [aulas, editables]
  );

  const sedes = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const aula of aulas) {
      if (!map.has(aula.sedeId)) map.set(aula.sedeId, aula.sede);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [aulas]);

  // Con una sede elegida, carreras y aulas se acotan a esa sede.
  const sedeCarreras = useMemo(
    () =>
      filterSede === "all"
        ? carreras
        : carreras.filter((c) => c.sedeIds.includes(filterSede)),
    [carreras, filterSede]
  );

  const sedeAulas = useMemo(
    () =>
      filterSede === "all"
        ? aulas
        : aulas.filter((a) => a.sedeId === filterSede),
    [aulas, filterSede]
  );

  const filteredCursadas = useMemo(() => {
    return cursadas.filter((c) => {
      // La sede de una cursada es la de su aula.
      if (filterSede !== "all" && c.aula.sedeId !== filterSede) return false;
      if (filterCarrera !== "all" && c.carrera.name !== filterCarrera) return false;
      if (filterAula !== "all" && c.aula.name !== filterAula) return false;
      if (filterExamen === "examen" && !c.examen) return false;
      if (filterExamen === "cursada" && c.examen) return false;
      return true;
    });
  }, [cursadas, filterSede, filterCarrera, filterAula, filterExamen]);

  return (
    <div className="space-y-6">
      <CursadasHeader
        carreras={carreras}
        asignaturas={asignaturas}
        docentes={docentes}
        aulasEditables={aulasEditables}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterSede}
          onValueChange={(value) => {
            setFilterSede(value);
            setFilterCarrera("all");
            setFilterAula("all");
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todas las sedes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sedes</SelectItem>
            {sedes.map((sede) => (
              <SelectItem key={sede.id} value={sede.id}>
                {sede.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCarrera} onValueChange={setFilterCarrera}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todas las carreras" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las carreras</SelectItem>
            {sedeCarreras.map((c) => (
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
            {sedeAulas.map((a) => (
              <SelectItem key={a.id} value={a.name}>
                {a.name} ({a.building})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterExamen} onValueChange={setFilterExamen}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Cursadas y eventos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cursadas y eventos</SelectItem>
            <SelectItem value="cursada">Solo cursadas</SelectItem>
            <SelectItem value="examen">Solo eventos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {viewMode === "table" && (
        <CursadasTable
          data={filteredCursadas}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          carreras={carreras}
          asignaturas={asignaturas}
          docentes={docentes}
          aulasEditables={aulasEditables}
          canEdit={canEdit}
          canDelete={canDelete}
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
          aulasEditables={aulasEditables}
          canEdit={canEdit}
          canDelete={canDelete}
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
          aulasEditables={aulasEditables}
          canEdit={canEdit}
          canDelete={canDelete}
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
          aulasEditables={aulasEditables}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
