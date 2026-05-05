"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  asignaturas,
  asignaturaDocentes,
  asignaturaRecesos,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

const recesoSchema = z
  .object({
    startDate: z.string().min(1, "Fecha de inicio requerida"),
    endDate: z.string().min(1, "Fecha de fin requerida"),
    notes: z.string().optional().nullable(),
  })
  .refine((r) => r.startDate <= r.endDate, {
    message: "La fecha de inicio debe ser anterior o igual a la de fin",
    path: ["endDate"],
  });

const asignaturaSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  carreraId: z.string().uuid("Carrera inválida"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  visible: z.boolean().default(true),
  docenteIds: z.array(z.string()).optional(),
  recesos: z.array(recesoSchema).default([]),
});

export async function getAsignaturas() {
  return await db.query.asignaturas.findMany({
    with: {
      carrera: true,
      asignaturaDocentes: {
        with: {
          user: true,
        },
      },
      recesos: true,
    },
    orderBy: (asignaturas, { asc }) => [asc(asignaturas.name)],
  });
}

export async function getAsignatura(id: string) {
  return await db.query.asignaturas.findFirst({
    where: eq(asignaturas.id, id),
    with: {
      carrera: true,
      asignaturaDocentes: {
        with: {
          user: true,
        },
      },
      recesos: true,
    },
  });
}

export async function getAsignaturasByCarrera(carreraId: string) {
  return await db.query.asignaturas.findMany({
    where: eq(asignaturas.carreraId, carreraId),
    orderBy: (asignaturas, { asc }) => [asc(asignaturas.name)],
  });
}

export async function createAsignatura(formData: FormData) {
  const docenteIdsRaw = formData.get("docenteIds") as string;
  const recesosRaw = formData.get("recesos") as string;
  const data = {
    name: formData.get("name") as string,
    carreraId: formData.get("carreraId") as string,
    startDate: formData.get("startDate") as string || null,
    endDate: formData.get("endDate") as string || null,
    visible: formData.get("visible") === "true",
    docenteIds: docenteIdsRaw ? JSON.parse(docenteIdsRaw) : [],
    recesos: recesosRaw ? JSON.parse(recesosRaw) : [],
  };

  const validated = asignaturaSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const [newAsignatura] = await db.insert(asignaturas).values({
    name: validated.data.name,
    carreraId: validated.data.carreraId,
    startDate: validated.data.startDate,
    endDate: validated.data.endDate,
    visible: validated.data.visible,
  }).returning();

  // Add docentes if any
  if (validated.data.docenteIds && validated.data.docenteIds.length > 0) {
    await db.insert(asignaturaDocentes).values(
      validated.data.docenteIds.map((userId) => ({
        asignaturaId: newAsignatura.id,
        userId,
      }))
    );
  }

  if (validated.data.recesos.length > 0) {
    await db.insert(asignaturaRecesos).values(
      validated.data.recesos.map((r) => ({
        asignaturaId: newAsignatura.id,
        startDate: r.startDate,
        endDate: r.endDate,
        notes: r.notes ?? null,
      }))
    );
  }

  revalidatePath("/admin/asignaturas");
  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true };
}

export async function updateAsignatura(id: string, formData: FormData) {
  const docenteIdsRaw = formData.get("docenteIds") as string;
  const recesosRaw = formData.get("recesos") as string;
  const data = {
    name: formData.get("name") as string,
    carreraId: formData.get("carreraId") as string,
    startDate: formData.get("startDate") as string || null,
    endDate: formData.get("endDate") as string || null,
    visible: formData.get("visible") === "true",
    docenteIds: docenteIdsRaw ? JSON.parse(docenteIdsRaw) : [],
    recesos: recesosRaw ? JSON.parse(recesosRaw) : [],
  };

  const validated = asignaturaSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db
    .update(asignaturas)
    .set({
      name: validated.data.name,
      carreraId: validated.data.carreraId,
      startDate: validated.data.startDate,
      endDate: validated.data.endDate,
      visible: validated.data.visible,
      updatedAt: new Date(),
    })
    .where(eq(asignaturas.id, id));

  // Update docentes - delete all and re-add
  await db.delete(asignaturaDocentes).where(eq(asignaturaDocentes.asignaturaId, id));

  if (validated.data.docenteIds && validated.data.docenteIds.length > 0) {
    await db.insert(asignaturaDocentes).values(
      validated.data.docenteIds.map((userId) => ({
        asignaturaId: id,
        userId,
      }))
    );
  }

  // Update recesos - delete all and re-add
  await db.delete(asignaturaRecesos).where(eq(asignaturaRecesos.asignaturaId, id));

  if (validated.data.recesos.length > 0) {
    await db.insert(asignaturaRecesos).values(
      validated.data.recesos.map((r) => ({
        asignaturaId: id,
        startDate: r.startDate,
        endDate: r.endDate,
        notes: r.notes ?? null,
      }))
    );
  }

  revalidatePath("/admin/asignaturas");
  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true };
}

const bulkRecesoSchema = z.object({
  asignaturaIds: z.array(z.string().uuid()).min(1, "Seleccione al menos una asignatura"),
  receso: recesoSchema,
});

export async function applyBulkReceso(input: {
  asignaturaIds: string[];
  receso: { startDate: string; endDate: string; notes: string | null };
}) {
  const validated = bulkRecesoSchema.safeParse(input);
  if (!validated.success) {
    return { error: validated.error.flatten() };
  }

  const { asignaturaIds, receso } = validated.data;

  const result = await db.transaction(async (tx) => {
    const existing = await tx.query.asignaturaRecesos.findMany({
      where: inArray(asignaturaRecesos.asignaturaId, asignaturaIds),
      columns: { id: true, startDate: true, endDate: true },
    });

    const overlappingIds = existing
      .filter(
        (r) => r.startDate <= receso.endDate && r.endDate >= receso.startDate
      )
      .map((r) => r.id);

    if (overlappingIds.length > 0) {
      await tx
        .delete(asignaturaRecesos)
        .where(inArray(asignaturaRecesos.id, overlappingIds));
    }

    await tx.insert(asignaturaRecesos).values(
      asignaturaIds.map((asignaturaId) => ({
        asignaturaId,
        startDate: receso.startDate,
        endDate: receso.endDate,
        notes: receso.notes ?? null,
      }))
    );

    return {
      applied: asignaturaIds.length,
      replaced: overlappingIds.length,
    };
  });

  revalidatePath("/admin/asignaturas");
  revalidatePath("/admin/cursadas");
  revalidatePath("/");
  return { success: true, ...result };
}

export async function deleteAsignatura(id: string) {
  await db.delete(asignaturas).where(eq(asignaturas.id, id));
  revalidatePath("/admin/asignaturas");
  revalidatePath("/admin/cursadas");
  return { success: true };
}
