"use client";

import { CursadaDialog } from "./cursada-dialog";
import { Button } from "@/components/ui/button";
import { Plus, TableProperties, CalendarDays, Calendar, Building } from "lucide-react";
import type { ViewMode } from "./cursadas-content";

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

interface CursadasHeaderProps {
  carreras: CarreraOption[];
  asignaturas: Asignatura[];
  docentes: Docente[];
  /** Aulas de las sedes donde el usuario puede editar cursadas. */
  aulasEditables: Aula[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function CursadasHeader({
  carreras,
  asignaturas,
  docentes,
  aulasEditables,
  viewMode,
  onViewModeChange,
}: CursadasHeaderProps) {
  // Sin ninguna sede editable no hay dónde crear la cursada.
  const canCreate = aulasEditables.length > 0;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cursadas</h1>
        <p className="text-muted-foreground">
          Gestiona las cursadas y horarios
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {viewMode && onViewModeChange && (
          <div className="flex items-center rounded-lg border">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("table")}
              className="rounded-r-none"
            >
              <TableProperties className="mr-1.5 h-4 w-4" />
              Tabla
            </Button>
            <Button
              variant={viewMode === "daily" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("daily")}
              className="rounded-none"
            >
              <Calendar className="mr-1.5 h-4 w-4" />
              Diaria
            </Button>
            <Button
              variant={viewMode === "weekly" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("weekly")}
              className="rounded-none"
            >
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Semanal
            </Button>
            <Button
              variant={viewMode === "aulas" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("aulas")}
              className="rounded-l-none"
            >
              <Building className="mr-1.5 h-4 w-4" />
              Aulas
            </Button>
          </div>
        )}
        {canCreate && (
          <CursadaDialog
            carreras={carreras}
            asignaturas={asignaturas}
            docentes={docentes}
            aulas={aulasEditables}
          >
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cursada
            </Button>
          </CursadaDialog>
        )}
      </div>
    </div>
  );
}
