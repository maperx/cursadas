// Reglas compartidas para decidir si una cursada se dicta en una fecha dada.
// Todas las vistas (grilla/semanal públicas y tabla/semanal/diaria/aulas de
// admin) deben usar estas funciones para que muestren lo mismo.

type Receso = { startDate: string; endDate: string };

export type CursadaAgendable = {
  id: string;
  aulaId: string;
  daysOfWeek: number[];
  startTime: string;
  durationMinutes: number;
  weeklyRepetition: boolean;
  eventDate: string | null;
  examen: boolean;
  asignatura: {
    startDate: string | null;
    endDate: string | null;
    recesos?: Receso[];
  };
};

/** Fecha local en formato YYYY-MM-DD (sin pasar por UTC). */
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Día de la semana (0=Domingo) de una fecha YYYY-MM-DD. */
export function dayOfWeekFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * ¿La cursada se dicta en esa fecha? Las semanales se dictan en sus días,
 * dentro del período de la asignatura y fuera de sus recesos; las de fecha
 * única, solo en su fecha.
 */
export function occursOn(cursada: CursadaAgendable, dateStr: string): boolean {
  if (!cursada.weeklyRepetition) return cursada.eventDate === dateStr;
  if (!cursada.daysOfWeek.includes(dayOfWeekFromDateStr(dateStr))) return false;
  const { startDate, endDate, recesos } = cursada.asignatura;
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  if (recesos?.some((r) => dateStr >= r.startDate && dateStr <= r.endDate)) {
    return false;
  }
  return true;
}

/**
 * Cursadas que se dictan en esa fecha. Con `prioridadEventos`, los eventos
 * (examen=true) desplazan a las cursadas regulares de la misma aula cuyo
 * horario se superpone, pero solo en esa fecha.
 */
export function cursadasDelDia<T extends CursadaAgendable>(
  cursadas: T[],
  dateStr: string,
  { prioridadEventos = false }: { prioridadEventos?: boolean } = {}
): T[] {
  const delDia = cursadas.filter((c) => occursOn(c, dateStr));
  if (!prioridadEventos) return delDia;

  const eventos = delDia.filter((c) => c.examen);
  return delDia.filter((cursada) => {
    if (cursada.examen) return true;
    const cStart = timeToMinutes(cursada.startTime);
    const cEnd = cStart + cursada.durationMinutes;
    return !eventos.some((evento) => {
      if (evento.aulaId !== cursada.aulaId) return false;
      const eStart = timeToMinutes(evento.startTime);
      const eEnd = eStart + evento.durationMinutes;
      return cStart < eEnd && eStart < cEnd;
    });
  });
}

/** Lunes de la semana de `date` (semana de lunes a domingo). */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

export function addDays(date: Date, n: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + n);
  return result;
}
