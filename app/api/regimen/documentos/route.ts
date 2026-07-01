import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth-server";
import {
  REGIMEN_DOC_ALLOWED_TYPES,
  REGIMEN_DOC_MAX_SIZE,
} from "@/lib/regimen-especial";

// Los documentos contienen datos personales (DNI, certificados), por eso se
// guardan FUERA de public/ y se sirven por una ruta autenticada.
const UPLOAD_DIR = path.join(process.cwd(), "uploads/regimen");

export async function POST(request: NextRequest) {
  // Cualquier usuario autenticado puede subir su propia documentación.
  await requireAuth();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No se proporcionó archivo" },
      { status: 400 }
    );
  }

  if (!REGIMEN_DOC_ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido. Use PDF, JPG, PNG o WebP" },
      { status: 400 }
    );
  }

  if (file.size > REGIMEN_DOC_MAX_SIZE) {
    return NextResponse.json(
      { error: "El archivo excede el tamaño máximo de 10MB" },
      { status: 400 }
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const fileName = `${randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(UPLOAD_DIR, fileName), Buffer.from(bytes));

  // Se devuelven los metadatos; el registro en la base se crea recién al
  // enviar la solicitud. Un archivo huérfano en disco no es accesible porque
  // la ruta de servido exige que exista la fila (y su dueño) en la base.
  return NextResponse.json({
    fileName,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
  });
}
