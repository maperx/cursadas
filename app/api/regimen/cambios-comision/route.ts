import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCambiosComisionListado } from "@/actions/regimen-especial";
import { REGIMEN_ESTADOS, type RegimenEstado } from "@/lib/regimen-especial";

// exceljs necesita el runtime de Node (no funciona en edge).
export const runtime = "nodejs";

const COLUMNS: { header: string; key: string; width: number }[] = [
  { header: "Apellidos", key: "apellidos", width: 24 },
  { header: "Nombres", key: "nombres", width: 22 },
  { header: "DNI", key: "dni", width: 14 },
  { header: "Teléfono", key: "telefono", width: 16 },
  { header: "Email", key: "email", width: 30 },
  { header: "Sede", key: "sede", width: 18 },
  { header: "Carrera", key: "carrera", width: 30 },
  { header: "Asignatura", key: "asignatura", width: 34 },
  { header: "Comisión actual", key: "comisionActual", width: 16 },
  { header: "Comisión deseada", key: "comisionDeseada", width: 17 },
  { header: "Estado del cambio", key: "estadoCambio", width: 22 },
  { header: "Observación del cambio", key: "observacionCambio", width: 40 },
  { header: "Fecha de solicitud", key: "fechaSolicitud", width: 18 },
  { header: "Cambio resuelto el", key: "fechaResolucionCambio", width: 18 },
];

// Sirve para el nombre del archivo: "San José" -> "san-jose".
function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: NextRequest) {
  // Los filtros llegan desde la tabla del admin (estado y sede).
  const params = request.nextUrl.searchParams;
  const estadoParam = params.get("estado");
  const estado = REGIMEN_ESTADOS.includes(estadoParam as RegimenEstado)
    ? (estadoParam as RegimenEstado)
    : null;
  const sede = params.get("sede")?.trim() || null;

  let rows;
  try {
    rows = await getCambiosComisionListado({ estado, sede });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }
    console.error("Error generando el Excel de cambios de comisión:", error);
    return NextResponse.json(
      { error: "No se pudo generar el archivo" },
      { status: 500 }
    );
  }

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Cambios de comisión", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = COLUMNS;

  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEFEF" },
  };

  for (const row of rows) {
    sheet.addRow(row);
  }

  // Las comisiones son numéricas pero se guardan como texto: se alinean a la
  // derecha para que el listado se lea como una columna de números.
  for (const key of ["comisionActual", "comisionDeseada"]) {
    sheet.getColumn(key).alignment = { horizontal: "right" };
  }
  for (const key of ["fechaSolicitud", "fechaResolucionCambio"]) {
    sheet.getColumn(key).numFmt = "dd/mm/yyyy";
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();

  // Los filtros aplicados van en el nombre para no pisar exportaciones previas.
  const partes = ["cambios-comision"];
  if (sede) partes.push(slug(sede));
  if (estado) partes.push(estado);
  partes.push(new Date().toISOString().slice(0, 10));
  const fileName = `${partes.join("-")}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
