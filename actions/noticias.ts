"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { noticias } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { unlink } from "fs/promises";
import path from "path";
import { requireNoticiasOrAdmin } from "@/lib/auth-server";

function imageUrlToFilePath(imageUrl: string): string {
  // /api/uploads/noticias/filename.jpg -> public/uploads/noticias/filename.jpg
  const relativePath = imageUrl.replace(/^\/api\//, "");
  return path.join(process.cwd(), "public", relativePath);
}

const noticiaSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  content: z.string().min(1, "El contenido es requerido"),
  imageUrl: z.string().optional(),
  sidebar: z.boolean().default(false),
  visible: z.boolean().default(true),
  publishedAt: z.string().min(1, "La fecha de publicación es requerida"),
});

export async function getNoticias() {
  return await db.query.noticias.findMany({
    orderBy: [desc(noticias.publishedAt)],
  });
}

export async function getNoticiasPublicas() {
  return await db.query.noticias.findMany({
    where: eq(noticias.visible, true),
    orderBy: [desc(noticias.publishedAt)],
  });
}

export async function getNoticia(id: string) {
  return await db.query.noticias.findFirst({
    where: eq(noticias.id, id),
  });
}

export async function createNoticia(formData: FormData) {
  await requireNoticiasOrAdmin();

  const data = {
    title: formData.get("title") as string,
    content: formData.get("content") as string,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
    sidebar: formData.get("sidebar") === "true",
    visible: formData.get("visible") === "true",
    publishedAt: formData.get("publishedAt") as string,
  };

  const validated = noticiaSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  await db.insert(noticias).values({
    title: validated.data.title,
    content: validated.data.content,
    imageUrl: validated.data.imageUrl || null,
    sidebar: validated.data.sidebar,
    visible: validated.data.visible,
    publishedAt: new Date(validated.data.publishedAt),
  });

  revalidatePath("/admin/noticias");
  revalidatePath("/noticias");
  return { success: true };
}

export async function updateNoticia(id: string, formData: FormData) {
  await requireNoticiasOrAdmin();

  const data = {
    title: formData.get("title") as string,
    content: formData.get("content") as string,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
    sidebar: formData.get("sidebar") === "true",
    visible: formData.get("visible") === "true",
    publishedAt: formData.get("publishedAt") as string,
  };

  const validated = noticiaSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  // Si la imagen cambió, eliminar la anterior
  const existing = await getNoticia(id);
  if (existing?.imageUrl && existing.imageUrl !== validated.data.imageUrl) {
    try {
      await unlink(imageUrlToFilePath(existing.imageUrl));
    } catch {
      // Ignorar si el archivo no existe
    }
  }

  await db
    .update(noticias)
    .set({
      title: validated.data.title,
      content: validated.data.content,
      imageUrl: validated.data.imageUrl || null,
      sidebar: validated.data.sidebar,
      visible: validated.data.visible,
      publishedAt: new Date(validated.data.publishedAt),
      updatedAt: new Date(),
    })
    .where(eq(noticias.id, id));

  revalidatePath("/admin/noticias");
  revalidatePath("/noticias");
  return { success: true };
}

export async function deleteNoticia(id: string) {
  await requireNoticiasOrAdmin();

  const existing = await getNoticia(id);
  if (existing?.imageUrl) {
    try {
      await unlink(imageUrlToFilePath(existing.imageUrl));
    } catch {
      // Ignorar si el archivo no existe
    }
  }

  await db.delete(noticias).where(eq(noticias.id, id));
  revalidatePath("/admin/noticias");
  revalidatePath("/noticias");
  return { success: true };
}
