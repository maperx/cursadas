import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { regimenEmailPlantillas } from "@/lib/db/schema";
import { getPermissions } from "@/lib/auth-server";
import { can } from "@/lib/permissions";
import { REGIMEN_EMAIL_UPLOAD_DIR } from "@/lib/regimen-email";
import {
  REGIMEN_EMAIL_ADJUNTO_MAX_SIZE,
  REGIMEN_EMAIL_ADJUNTO_TYPE,
} from "@/lib/regimen-especial";

// Los archivos se nombran con un UUID al subirlos: solo se sirve lo que tenga
// esa forma, así el parámetro no puede escaparse del directorio de subidas.
const FILE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

async function requireConfigurarEmails() {
  const perms = await getPermissions();
  return can(perms, "regimen", "configurarEmails");
}

// Sube el PDF que se adjunta a los emails del régimen especial. El archivo
// queda asociado a la plantilla recién cuando se guarda desde el panel.
export async function POST(request: NextRequest) {
  if (!(await requireConfigurarEmails())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No se proporcionó archivo" },
      { status: 400 }
    );
  }

  if (file.type !== REGIMEN_EMAIL_ADJUNTO_TYPE) {
    return NextResponse.json(
      { error: "El adjunto debe ser un PDF" },
      { status: 400 }
    );
  }

  if (file.size > REGIMEN_EMAIL_ADJUNTO_MAX_SIZE) {
    return NextResponse.json(
      { error: "El archivo excede el tamaño máximo de 10MB" },
      { status: 400 }
    );
  }

  await mkdir(REGIMEN_EMAIL_UPLOAD_DIR, { recursive: true });

  const fileName = `${randomUUID()}.pdf`;
  const bytes = await file.arrayBuffer();
  await writeFile(
    path.join(REGIMEN_EMAIL_UPLOAD_DIR, fileName),
    Buffer.from(bytes)
  );

  return NextResponse.json({
    fileName,
    originalName: file.name,
    mimeType: REGIMEN_EMAIL_ADJUNTO_TYPE,
    size: file.size,
  });
}

// Vista previa del adjunto desde el panel (el recién subido o el ya guardado).
export async function GET(request: NextRequest) {
  if (!(await requireConfigurarEmails())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const fileName = request.nextUrl.searchParams.get("file") ?? "";
  if (!FILE_RE.test(fileName)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const plantilla = await db.query.regimenEmailPlantillas.findFirst({
    where: eq(regimenEmailPlantillas.adjuntoFileName, fileName),
    columns: { adjuntoOriginalName: true },
  });

  try {
    const file = await readFile(path.join(REGIMEN_EMAIL_UPLOAD_DIR, fileName));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": REGIMEN_EMAIL_ADJUNTO_TYPE,
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          plantilla?.adjuntoOriginalName ?? "adjunto.pdf"
        )}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Archivo no encontrado" },
      { status: 404 }
    );
  }
}
