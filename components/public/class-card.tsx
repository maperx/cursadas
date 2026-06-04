"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, StickyNote, Ban } from "lucide-react";
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
        name: string;
      };
    }[];
    suspension?: { date: string; observacion: string | null } | null;
  };
  index?: number;
}

export function ClassCard({ cursada, index = 0 }: ClassCardProps) {
  const endTime = addMinutesToTime(cursada.startTime, cursada.durationMinutes);
  const docenteNames = cursada.cursadaDocentes
    .map((cd) => cd.user.name)
    .join(", ");
  const isSuspended = !!cursada.suspension;
  const suspensionDateLabel = cursada.suspension
    ? cursada.suspension.date.split("-").reverse().join("/")
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card className={`h-full overflow-hidden hover:shadow-lg transition-shadow ${isSuspended ? "opacity-70" : ""}`}>
        <div
          className="h-2"
          style={{ backgroundColor: cursada.carrera.color }}
        />
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={`font-semibold leading-tight ${isSuspended ? "line-through" : ""}`}>
                {cursada.asignatura.name}
              </h3>
              {cursada.commissionNumber && (
                <p className="text-sm text-muted-foreground">
                  Comisión {cursada.commissionNumber}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Badge
              style={{ backgroundColor: cursada.carrera.color }}
              className="text-white shrink-0"
            >
              {cursada.carrera.name}
            </Badge>
            {isSuspended && (
              <Badge variant="destructive" className="shrink-0">
                Suspendida
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isSuspended && (
            <div className="flex items-start gap-2 text-sm rounded-md bg-destructive/10 border border-destructive/20 p-2">
              <Ban className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-destructive">
                  Clase suspendida el {suspensionDateLabel}
                </span>
                {cursada.suspension?.observacion && (
                  <p className="text-muted-foreground">
                    {cursada.suspension.observacion}
                  </p>
                )}
              </div>
            </div>
          )}
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

          {cursada.notes && (
            <div className="flex items-start gap-2 text-sm">
              <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="line-clamp-3">{cursada.notes}</span>
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
