"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import { createInscripcion } from "@/actions/inscripciones";
import { formatTime, addMinutesToTime, getDayName } from "@/lib/utils";
import { Clock, MapPin, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Cursada = {
  id: string;
  startTime: string;
  durationMinutes: number;
  daysOfWeek: number[];
  commissionNumber: string | null;
  asignatura: {
    name: string;
  };
  carrera: {
    name: string;
    color: string;
  };
  aula: {
    name: string;
    building: string;
  };
};

interface InscripcionDialogProps {
  children: React.ReactNode;
  cursadasDisponibles: Cursada[];
  userId: string;
}

export function InscripcionDialog({
  children,
  cursadasDisponibles,
  userId,
}: InscripcionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredCursadas = cursadasDisponibles.filter(
    (c) =>
      c.asignatura.name.toLowerCase().includes(search.toLowerCase()) ||
      c.carrera.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleInscripcion = async (cursadaId: string) => {
    setIsLoading(cursadaId);
    try {
      const result = await createInscripcion(userId, cursadaId);
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Inscripción exitosa",
          description: "Te has inscripto correctamente a la cursada",
          variant: "success",
        });
        setOpen(false);
        router.refresh();
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo procesar la inscripción",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Inscribirme a una cursada</DialogTitle>
          <DialogDescription>
            Selecciona la cursada a la que deseas inscribirte
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Buscar por asignatura o carrera..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />

        <ScrollArea className="h-[400px] pr-4">
          {filteredCursadas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search
                ? "No se encontraron cursadas con ese criterio"
                : "No hay cursadas disponibles para inscribirte"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCursadas.map((cursada) => {
                const endTime = addMinutesToTime(
                  cursada.startTime,
                  cursada.durationMinutes
                );
                return (
                  <div
                    key={cursada.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {cursada.asignatura.name}
                          </h4>
                          {cursada.commissionNumber && (
                            <span className="text-sm text-muted-foreground">
                              (Com. {cursada.commissionNumber})
                            </span>
                          )}
                        </div>

                        <Badge
                          style={{ backgroundColor: cursada.carrera.color }}
                          className="text-white"
                        >
                          {cursada.carrera.name}
                        </Badge>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(cursada.startTime)} - {endTime}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {cursada.aula.name} - {cursada.aula.building}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {cursada.daysOfWeek.map((day) => (
                            <Badge
                              key={day}
                              variant="outline"
                              className="text-xs"
                            >
                              {getDayName(day)}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleInscripcion(cursada.id)}
                        disabled={isLoading !== null}
                      >
                        {isLoading === cursada.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Inscribirme
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
