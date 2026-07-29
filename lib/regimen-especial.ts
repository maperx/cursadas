// Constantes compartidas del Régimen especial de cursado.
// Se importan tanto desde el schema de la base (para los pgEnum) como desde
// los formularios y la UI, así los valores quedan siempre sincronizados.

export const REGIMEN_ESTADOS = ["pendiente", "aprobada", "rechazada"] as const;
export type RegimenEstado = (typeof REGIMEN_ESTADOS)[number];

// Estado del sub-flujo de "cambio de comisión", disponible una vez que la
// solicitud fue aprobada. El estudiante carga los cambios mientras está
// "pendiente"; cuando el admin los aprueba pasa a "aprobado" y se bloquea.
export const REGIMEN_CAMBIO_ESTADOS = ["pendiente", "aprobado"] as const;
export type RegimenCambioEstado = (typeof REGIMEN_CAMBIO_ESTADOS)[number];

export const REGIMEN_MOTIVOS = ["laboral", "personas_a_cargo", "ambos"] as const;
export type RegimenMotivo = (typeof REGIMEN_MOTIVOS)[number];

export const REGIMEN_SEDES = [
  "parana",
  "ramirez",
  "gualeguay",
  "villaguay",
  "concordia",
] as const;
export type RegimenSede = (typeof REGIMEN_SEDES)[number];

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

export const SEDE_LABELS: Record<RegimenSede, string> = {
  parana: "Paraná",
  ramirez: "Ramírez",
  gualeguay: "Gualeguay",
  villaguay: "Villaguay",
  concordia: "Concordia",
};

export const ESTADO_LABELS: Record<RegimenEstado, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export const CAMBIO_ESTADO_LABELS: Record<RegimenCambioEstado, string> = {
  pendiente: "Pendiente de aprobación",
  aprobado: "Aprobado",
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
