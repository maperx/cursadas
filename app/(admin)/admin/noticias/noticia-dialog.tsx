"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { createNoticia, updateNoticia } from "@/actions/noticias";
import { ImagePlus, X } from "lucide-react";

interface NoticiaDialogProps {
  children: React.ReactNode;
  noticia?: {
    id: string;
    title: string;
    content: string;
    imageUrl: string | null;
    sidebar: boolean;
    visible: boolean;
    publishedAt: Date;
  };
}

export function NoticiaDialog({ children, noticia }: NoticiaDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [sidebar, setSidebar] = useState(noticia?.sidebar ?? false);
  const [visible, setVisible] = useState(noticia?.visible ?? true);
  const [content, setContent] = useState(noticia?.content || "");
  const [imageUrl, setImageUrl] = useState(noticia?.imageUrl || "");
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!noticia;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        setImageUrl(data.url);
      }
    } catch {
      toast({ title: "Error", description: "Error al subir la imagen", variant: "destructive" });
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    formData.set("content", content);
    formData.set("imageUrl", imageUrl);
    formData.set("sidebar", sidebar ? "true" : "false");
    formData.set("visible", visible ? "true" : "false");

    const result = isEditing
      ? await updateNoticia(noticia.id, formData)
      : await createNoticia(formData);

    if (result.error) {
      setErrors(result.error);
      setIsLoading(false);
      return;
    }

    toast({
      title: isEditing ? "Noticia actualizada" : "Noticia creada",
      description: isEditing
        ? "La noticia se ha actualizado correctamente"
        : "La noticia se ha creado correctamente",
      variant: "success",
    });

    setIsLoading(false);
    setOpen(false);
    router.refresh();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Noticia" : "Nueva Noticia"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              defaultValue={noticia?.title}
              placeholder="Título de la noticia"
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="publishedAt">Fecha de publicación</Label>
            <Input
              id="publishedAt"
              name="publishedAt"
              type="date"
              defaultValue={noticia ? formatDate(noticia.publishedAt) : new Date().toISOString().split("T")[0]}
              disabled={isLoading}
            />
            {errors.publishedAt && (
              <p className="text-sm text-destructive">{errors.publishedAt[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Imagen</Label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="h-24 w-36 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading || isLoading}
                  className="h-24 w-36 border-2 border-dashed rounded flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {imageUploading ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-xs">Subir imagen</span>
                    </>
                  )}
                </button>
              )}
              {imageUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading || isLoading}
                >
                  Cambiar
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <Label>Contenido</Label>
            <TiptapEditor
              content={content}
              onChange={setContent}
              disabled={isLoading}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content[0]}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input type="hidden" name="sidebar" value={sidebar ? "true" : "false"} />
            <Checkbox
              id="sidebar"
              checked={sidebar}
              onCheckedChange={(checked) => setSidebar(checked === true)}
              disabled={isLoading}
            />
            <Label htmlFor="sidebar" className="cursor-pointer">
              No va al Carousel
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <input type="hidden" name="visible" value={visible ? "true" : "false"} />
            <Checkbox
              id="visible"
              checked={visible}
              onCheckedChange={(checked) => setVisible(checked === true)}
              disabled={isLoading}
            />
            <Label htmlFor="visible" className="cursor-pointer">
              Visible en página pública
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : isEditing ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
