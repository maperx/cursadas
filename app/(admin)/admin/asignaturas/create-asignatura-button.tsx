"use client";

import { AsignaturaDialog } from "./asignatura-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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

interface CreateAsignaturaButtonProps {
  carreras: Carrera[];
  docentes: Docente[];
}

export function CreateAsignaturaButton({ carreras, docentes }: CreateAsignaturaButtonProps) {
  return (
    <AsignaturaDialog carreras={carreras} docentes={docentes}>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Nueva Asignatura
      </Button>
    </AsignaturaDialog>
  );
}
