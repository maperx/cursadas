"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, Users } from "lucide-react";
import { formatTime, addMinutesToTime, getDayName } from "@/lib/utils";

interface ClassCardProps {
  cursada: {
    id: string;
    startTime: string;
    durationMinutes: number;
    daysOfWeek: number[];
    weeklyRepetition: boolean;
    eventDate: string | null;
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
  index?: number;
}

export function ClassCard({ cursada, index = 0 }: ClassCardProps) {
  const endTime = addMinutesToTime(cursada.startTime, cursada.durationMinutes);
  const docenteNames = cursada.cursadaDocentes
    .map((cd) => cd.docente.name)
    .join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
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
          </div>
          <Badge
            style={{ backgroundColor: cursada.carrera.color }}
            className="text-white shrink-0"
          >
            {cursada.carrera.name}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatTime(cursada.startTime)} - {endTime}
            </span>
            <span className="text-muted-foreground">
              ({cursada.durationMinutes} min)
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
            {!cursada.weeklyRepetition && cursada.eventDate ? (
              <Badge variant="secondary" className="text-xs">
                {cursada.eventDate.split("-").reverse().join("/")}
              </Badge>
            ) : (
              cursada.daysOfWeek.map((day) => (
                <Badge key={day} variant="outline" className="text-xs">
                  {getDayName(day)}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
