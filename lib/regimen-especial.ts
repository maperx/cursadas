// Constantes compartidas del Régimen especial de cursado.
// Se importan tanto desde el schema de la base (para los pgEnum) como desde
// los formularios y la UI, así los valores quedan siempre sincronizados.

export const REGIMEN_ESTADOS = ["pendiente", "aprobada", "rechazada"] as const;
export type RegimenEstado = (typeof REGIMEN_ESTADOS)[number];

// Estado del sub-flujo de "cambio de comisión", disponible una vez que la
// solicitud fue aprobada. El estudiante carga los cambios mientras está
// "pendiente"; cuando quien resuelve los cambios lo aprueba o lo rechaza queda
// bloqueado (se puede reabrir para que el estudiante lo vuelva a editar).
export const REGIMEN_CAMBIO_ESTADOS = [
  "pendiente",
  "aprobado",
  "rechazado",
] as const;
export type RegimenCambioEstado = (typeof REGIMEN_CAMBIO_ESTADOS)[number];

/** Estados a los que puede llevar un cambio quien tiene `resolverCambios`. */
export const REGIMEN_CAMBIO_RESOLUCIONES = ["aprobado", "rechazado"] as const;
export type RegimenCambioResolucion =
  (typeof REGIMEN_CAMBIO_RESOLUCIONES)[number];

/** Un cambio resuelto (aprobado o rechazado) ya no lo puede editar el alumno. */
export function cambioResuelto(estado: RegimenCambioEstado): boolean {
  return estado !== "pendiente";
}

export const REGIMEN_MOTIVOS = ["laboral", "personas_a_cargo", "ambos"] as const;
export type RegimenMotivo = (typeof REGIMEN_MOTIVOS)[number];

// Las sedes son una entidad de la base (tabla `sedes`), no una lista fija:
// se cargan desde el ABM de sedes del admin.

// Grupos de documentación. El orden se respeta en la UI.
export const DOC_GENERALES = [
  "certificado_estudiante",
  "foto_dni",
  "foto_perfil",
] as const;

export const DOC_LABORALES = [
  "cert_laboral",
  "alta_afip",
  "ddjj_laboral",
] as const;

export const DOC_PERSONAS = [
  "partida_nacimiento",
  "constancia_adopcion",
  "vinculo_otro",
] as const;

export const REGIMEN_DOC_TIPOS = [
  ...DOC_GENERALES,
  ...DOC_LABORALES,
  ...DOC_PERSONAS,
] as const;
export type RegimenDocTipo = (typeof REGIMEN_DOC_TIPOS)[number];

export const MOTIVO_LABELS: Record<RegimenMotivo, string> = {
  laboral: "Laboral",
  personas_a_cargo: "Personas a cargo",
  ambos: "Ambos",
};

export const ESTADO_LABELS: Record<RegimenEstado, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export const CAMBIO_ESTADO_LABELS: Record<RegimenCambioEstado, string> = {
  pendiente: "Pendiente de aprobación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export const DOC_TIPO_LABELS: Record<RegimenDocTipo, string> = {
  certificado_estudiante: "Certificado de Estudiante UADER",
  foto_dni: "Foto del DNI",
  foto_perfil: "Foto de perfil",
  cert_laboral: "Certificado Laboral (con horarios)",
  alta_afip: "Alta / inscripción ante AFIP",
  ddjj_laboral: "Declaración Jurada (Juzgado de Paz / Policía)",
  partida_nacimiento: "Partida de nacimiento / Libreta de Familia",
  constancia_adopcion: "Constancia judicial de adopción",
  vinculo_otro: "Otra documentación que acredite el vínculo",
};

// Las comisiones son solo dígitos. La comisión actual se carga junto con la
// solicitud (una por asignatura marcada); la deseada, después de la aprobación.
export const soloNumeros = (value: string) => value.replace(/[^0-9]/g, "");

// Hay un "cambio de comisión" cuando el estudiante pidió una comisión distinta
// de aquella en la que declaró estar inscripto al enviar la solicitud.
export function esCambioComision(a: {
  comisionActual: string | null;
  comisionDeseada: string | null;
}): boolean {
  return Boolean(a.comisionDeseada) && a.comisionDeseada !== a.comisionActual;
}

export type AsignaturaCambio = {
  comisionActual: string | null;
  comisionDeseada: string | null;
  comisionEstado: RegimenCambioEstado;
};

export type ResumenCambios = {
  /** Cambios pedidos por el estudiante (aprobados + rechazados + pendientes). */
  pedidos: number;
  aprobados: number;
  rechazados: number;
  pendientes: number;
};

// Resumen de los cambios de comisión de UNA solicitud. El sub-flujo solo existe
// para las solicitudes aprobadas, así que las demás cuentan cero aunque tengan
// datos cargados (p. ej. una solicitud reabierta y luego rechazada).
export function resumenCambiosComision(solicitud: {
  estado: RegimenEstado;
  asignaturas: AsignaturaCambio[];
}): ResumenCambios {
  if (solicitud.estado !== "aprobada") {
    return { pedidos: 0, aprobados: 0, rechazados: 0, pendientes: 0 };
  }
  const cambios = solicitud.asignaturas.filter(esCambioComision);
  const aprobados = cambios.filter(
    (a) => a.comisionEstado === "aprobado"
  ).length;
  const rechazados = cambios.filter(
    (a) => a.comisionEstado === "rechazado"
  ).length;
  return {
    pedidos: cambios.length,
    aprobados,
    rechazados,
    pendientes: cambios.length - aprobados - rechazados,
  };
}

// Categorías para filtrar el listado del admin por el estado de los cambios.
export const CAMBIOS_FILTROS = [
  "pendientes",
  "aprobados",
  "rechazados",
  "sin",
] as const;
export type CambiosFiltro = (typeof CAMBIOS_FILTROS)[number];

export const CAMBIOS_FILTRO_LABELS: Record<CambiosFiltro, string> = {
  pendientes: "Con cambios pendientes",
  aprobados: "Con cambios aprobados",
  rechazados: "Con cambios rechazados",
  sin: "Sin cambios de comisión",
};

// Una solicitud cae en una sola categoría: si le queda algo sin resolver es
// "pendientes"; ya resuelta, "rechazados" si tuvo al menos un rechazo.
export function cambiosFiltro(resumen: ResumenCambios): CambiosFiltro {
  if (resumen.pedidos === 0) return "sin";
  if (resumen.pendientes > 0) return "pendientes";
  return resumen.rechazados > 0 ? "rechazados" : "aprobados";
}

export function motivoIncluyeLaboral(motivo: RegimenMotivo): boolean {
  return motivo === "laboral" || motivo === "ambos";
}

export function motivoIncluyePersonas(motivo: RegimenMotivo): boolean {
  return motivo === "personas_a_cargo" || motivo === "ambos";
}

// Tipos y tamaños permitidos para los documentos subidos.
export const REGIMEN_DOC_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const REGIMEN_DOC_MAX_SIZE = 10 * 1024 * 1024; // 10MB

// --- Plantillas de los emails que se envían al estudiante ---

// Cada tipo corresponde a un momento del flujo en el que se notifica al
// estudiante. El texto y el PDF adjunto se configuran desde el panel admin.
export const REGIMEN_EMAIL_TIPOS = [
  "solicitud_aprobada",
  "cambios_comision_aprobados",
] as const;
export type RegimenEmailTipo = (typeof REGIMEN_EMAIL_TIPOS)[number];

export const REGIMEN_EMAIL_LABELS: Record<RegimenEmailTipo, string> = {
  solicitud_aprobada: "Solicitud aprobada",
  cambios_comision_aprobados: "Cambios de comisión resueltos",
};

export const REGIMEN_EMAIL_HINTS: Record<RegimenEmailTipo, string> = {
  solicitud_aprobada:
    "Se envía al estudiante en el momento en que se aprueba su solicitud de régimen especial.",
  cambios_comision_aprobados:
    "Se envía cuando se resuelve el último cambio de comisión pendiente de la solicitud, es decir, cuando ya no le queda ninguno sin aprobar o rechazar. La lista {{cambios}} indica cómo quedó cada uno.",
};

/** Variables que se reemplazan en el asunto y en el cuerpo de la plantilla. */
export type RegimenEmailVariable = {
  key: string;
  label: string;
  /** Si se omite, la variable existe en todas las plantillas. */
  tipos?: RegimenEmailTipo[];
};

export const REGIMEN_EMAIL_VARIABLES: RegimenEmailVariable[] = [
  { key: "nombre", label: "Apellidos y nombres del estudiante" },
  { key: "apellidos", label: "Apellidos" },
  { key: "nombres", label: "Nombres" },
  { key: "dni", label: "DNI" },
  { key: "carrera", label: "Carrera" },
  { key: "sede", label: "Sede" },
  { key: "motivo", label: "Motivo del régimen especial" },
  { key: "asignaturas", label: "Lista de asignaturas de la solicitud" },
  {
    key: "observaciones",
    label: "Observaciones cargadas en la revisión",
    tipos: ["solicitud_aprobada"],
  },
  {
    key: "cambios",
    label: "Lista de cambios de comisión, con su resultado y observación",
    tipos: ["cambios_comision_aprobados"],
  },
];

export function variablesDePlantilla(
  tipo: RegimenEmailTipo
): RegimenEmailVariable[] {
  return REGIMEN_EMAIL_VARIABLES.filter((v) => !v.tipos || v.tipos.includes(tipo));
}

/**
 * Reemplaza los `{{marcadores}}` por sus valores. Los valores llegan ya
 * escapados (o son HTML generado por nosotros, como la lista de cambios);
 * un marcador sin valor se borra en lugar de quedar a la vista.
 */
export function renderPlantilla(
  texto: string,
  vars: Record<string, string>
): string {
  return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    vars[key] ?? ""
  );
}

export const REGIMEN_EMAIL_DEFAULTS: Record<
  RegimenEmailTipo,
  { asunto: string; cuerpo: string }
> = {
  solicitud_aprobada: {
    asunto: "Régimen especial de cursado - Solicitud aprobada",
    cuerpo: [
      "<h2>Tu solicitud fue aprobada</h2>",
      "<p>¡Hola {{nombres}}!</p>",
      "<p>Tu solicitud de inscripción al <strong>Régimen especial de cursado</strong> (motivo: {{motivo}}) fue <strong>aprobada</strong>.</p>",
      "<p>{{observaciones}}</p>",
      "<p>Ya podés cargar los cambios de comisión que necesites ingresando a tu cuenta, en la sección “Régimen especial”.</p>",
    ].join(""),
  },
  cambios_comision_aprobados: {
    asunto: "Régimen especial de cursado - Cambios de comisión resueltos",
    cuerpo: [
      "<h2>Tus cambios de comisión ya fueron resueltos</h2>",
      "<p>¡Hola {{nombres}}!</p>",
      "<p>Así quedaron los cambios de comisión que solicitaste:</p>",
      "<p>{{cambios}}</p>",
      "<p>Podés ver el detalle ingresando a tu cuenta, en la sección “Régimen especial”.</p>",
    ].join(""),
  },
};

// El adjunto de las plantillas es un PDF (nota, resolución, instructivo).
export const REGIMEN_EMAIL_ADJUNTO_TYPE = "application/pdf";
export const REGIMEN_EMAIL_ADJUNTO_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export type RegimenEmailAdjunto = {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
