"use client";

import { CursadaDialog } from "./cursada-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
}

export function CursadasHeader({
  carreras,
  asignaturas,
  docentes,
  aulas,
}: CursadasHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cursadas</h1>
        <p className="text-muted-foreground">
          Gestiona las cursadas y horarios
        </p>
      </div>
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
  );
}
