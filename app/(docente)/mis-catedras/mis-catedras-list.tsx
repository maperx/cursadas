"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, StickyNote } from "lucide-react";
import { formatTime, addMinutesToTime, getDayName } from "@/lib/utils";

type Cursada = {
  id: string;
  startTime: string;
  durationMinutes: number;
  daysOfWeek: number[];
  commissionNumber: string | null;
  notes: string | null;
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
    user: {
      id: string;
      name: string;
    };
  }[];
};

function CatedraCard({
  cursada,
  index,
  currentUserId,
}: {
  cursada: Cursada;
  index: number;
  currentUserId: string;
}) {
  const endTime = addMinutesToTime(cursada.startTime, cursada.durationMinutes);
  const otherDocentes = cursada.cursadaDocentes
    .filter((cd) => cd.user.id !== currentUserId)
    .map((cd) => cd.user.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden">
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
            <Badge
              style={{ backgroundColor: cursada.carrera.color }}
              className="text-white shrink-0"
            >
              {cursada.carrera.name}
            </Badge>
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

          {otherDocentes.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="line-clamp-2">{otherDocentes.join(", ")}</span>
            </div>
          )}

          {cursada.notes && (
            <div className="flex items-start gap-2 text-sm">
              <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="line-clamp-3">{cursada.notes}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-1 pt-2">
            {cursada.daysOfWeek.map((day) => (
              <Badge key={day} variant="outline" className="text-xs">
                {getDayName(day)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface MisCatedrasListProps {
  cursadas: Cursada[];
  currentUserId: string;
}

export function MisCatedrasList({ cursadas, currentUserId }: MisCatedrasListProps) {
  if (cursadas.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No tenés cátedras asignadas actualmente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cursadas.map((cursada, index) => (
        <CatedraCard
          key={cursada.id}
          cursada={cursada}
          index={index}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
