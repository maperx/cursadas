"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, User, XCircle } from "lucide-react";
import { formatTime, addMinutesToTime, getDayName } from "@/lib/utils";
import { darDeBajaInscripcion } from "@/actions/inscripciones";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

type Inscripcion = {
  id: string;
  status: "activa" | "baja";
  cursada: {
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
    cursadaDocentes: {
      docente: {
        name: string;
      };
    }[];
  };
};

function InscripcionCard({
  inscripcion,
  index,
}: {
  inscripcion: Inscripcion;
  index: number;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { cursada } = inscripcion;
  const endTime = addMinutesToTime(cursada.startTime, cursada.durationMinutes);
  const docenteNames = cursada.cursadaDocentes
    .map((cd) => cd.docente.name)
    .join(", ");

  const handleBaja = async () => {
    setIsLoading(true);
    try {
      await darDeBajaInscripcion(inscripcion.id);
      toast({
        title: "Baja exitosa",
        description: `Te has dado de baja de ${cursada.asignatura.name}`,
        variant: "success",
      });
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo procesar la baja",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="h-full"
    >
      <Card
        className={`h-full overflow-hidden ${
          inscripcion.status === "baja" ? "opacity-60" : ""
        }`}
      >
        <div
          className="h-2"
          style={{ backgroundColor: cursada.carrera.color }}
        />
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold leading-tight">
                {cursada.asignatura.name}
              </h3>
              {cursada.commissionNumber && (
                <p className="text-sm text-muted-foreground">
                  Comisión {cursada.commissionNumber}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                style={{ backgroundColor: cursada.carrera.color }}
                className="text-white shrink-0"
              >
                {cursada.carrera.name}
              </Badge>
              <Badge
                variant={inscripcion.status === "activa" ? "success" : "secondary"}
              >
                {inscripcion.status === "activa" ? "Activa" : "Baja"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatTime(cursada.startTime)} - {endTime}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {cursada.aula.name} - {cursada.aula.building}
            </span>
          </div>

          {docenteNames && (
            <div className="flex items-start gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="line-clamp-2">{docenteNames}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-1 pt-2">
            {cursada.daysOfWeek.map((day) => (
              <Badge key={day} variant="outline" className="text-xs">
                {getDayName(day)}
              </Badge>
            ))}
          </div>

          {inscripcion.status === "activa" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Darme de baja
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar baja</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de que deseas darte de baja de{" "}
                    <strong>{cursada.asignatura.name}</strong>? Podrás volver a
                    inscribirte en cualquier momento.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleBaja}
                    disabled={isLoading}
                  >
                    {isLoading ? <Spinner size="sm" /> : "Confirmar baja"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface MisCursadasListProps {
  inscripciones: Inscripcion[];
}

export function MisCursadasList({ inscripciones }: MisCursadasListProps) {
  const activas = inscripciones.filter((i) => i.status === "activa");
  const bajas = inscripciones.filter((i) => i.status === "baja");

  if (inscripciones.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No tienes inscripciones aún. Presiona &quot;Inscribirme&quot; para comenzar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {activas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Inscripciones Activas</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activas.map((inscripcion, index) => (
              <InscripcionCard
                key={inscripcion.id}
                inscripcion={inscripcion}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {bajas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-muted-foreground">
            Bajas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bajas.map((inscripcion, index) => (
              <InscripcionCard
                key={inscripcion.id}
                inscripcion={inscripcion}
                index={index}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
