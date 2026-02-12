"use client";

import { CursadaDialog } from "./cursada-dialog";
import { Button } from "@/components/ui/button";
import { Plus, TableProperties, CalendarDays, Calendar } from "lucide-react";
import type { ViewMode } from "./cursadas-content";

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

interface CursadasHeaderProps {
  carreras: Carrera[];
  asignaturas: Asignatura[];
  docentes: Docente[];
  aulas: Aula[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function CursadasHeader({
  carreras,
  asignaturas,
  docentes,
  aulas,
  viewMode,
  onViewModeChange,
}: CursadasHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cursadas</h1>
        <p className="text-muted-foreground">
          Gestiona las cursadas y horarios
        </p>
      </div>
      <div className="flex items-center gap-2">
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
              className="rounded-l-none"
            >
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Semanal
            </Button>
          </div>
        )}
        <CursadaDialog
          carreras={carreras}
          asignaturas={asignaturas}
          docentes={docentes}
          aulas={aulas}
        >
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cursada
          </Button>
        </CursadaDialog>
      </div>
    </div>
  );
}
