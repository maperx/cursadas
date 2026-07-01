import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { regimenDocumentos } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-server";

const UPLOAD_DIR = path.join(process.cwd(), "uploads/regimen");
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const doc = await db.query.regimenDocumentos.findFirst({
    where: eq(regimenDocumentos.id, id),
    with: {
      solicitud: {
        columns: { userId: true },
      },
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Solo el dueño de la solicitud o un admin pueden ver la documentación.
  const isOwner = doc.solicitud.userId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  try {
    const file = await readFile(path.join(UPLOAD_DIR, doc.fileName));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          doc.originalName
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
