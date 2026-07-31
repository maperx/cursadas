"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, RotateCcw, Upload, X } from "lucide-react";
import { updateRegimenEmailPlantilla } from "@/actions/regimen-especial";
import {
  REGIMEN_EMAIL_DEFAULTS,
  REGIMEN_EMAIL_HINTS,
  REGIMEN_EMAIL_LABELS,
  formatFileSize,
  variablesDePlantilla,
  type RegimenEmailAdjunto,
  type RegimenEmailTipo,
} from "@/lib/regimen-especial";

export type PlantillaData = {
  tipo: RegimenEmailTipo;
  asunto: string;
  cuerpo: string;
  activo: boolean;
  adjunto: RegimenEmailAdjunto | null;
  configurada: boolean;
};

export function PlantillaForm({ plantilla }: { plantilla: PlantillaData }) {
  const router = useRouter();
  const [asunto, setAsunto] = useState(plantilla.asunto);
  const [cuerpo, setCuerpo] = useState(plantilla.cuerpo);
  const [activo, setActivo] = useState(plantilla.activo);
  const [adjunto, setAdjunto] = useState(plantilla.adjunto);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  // El editor toma su contenido al montarse: se remonta para recargarlo.
  const [editorKey, setEditorKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const disabled = saving || uploading;
  const variables = variablesDePlantilla(plantilla.tipo);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/regimen/email-adjunto", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast({
          title: "Error",
          description: data.error ?? "No se pudo subir el archivo",
          variant: "destructive",
        });
      } else {
        setAdjunto(data);
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const restaurarTexto = () => {
    const defaults = REGIMEN_EMAIL_DEFAULTS[plantilla.tipo];
    setAsunto(defaults.asunto);
    setCuerpo(defaults.cuerpo);
    setEditorKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await updateRegimenEmailPlantilla({
        tipo: plantilla.tipo,
        asunto,
        cuerpo,
        activo,
        adjunto,
      });
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Plantilla guardada",
          description: `Se actualizó el email de "${
            REGIMEN_EMAIL_LABELS[plantilla.tipo]
          }".`,
          variant: "success",
        });
        router.refresh();
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo guardar la plantilla",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{REGIMEN_EMAIL_LABELS[plantilla.tipo]}</CardTitle>
        <CardDescription>
          {REGIMEN_EMAIL_HINTS[plantilla.tipo]}
          {!plantilla.configurada && " Ahora rige el texto por defecto."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`asunto-${plantilla.tipo}`}>Asunto</Label>
            <Input
              id={`asunto-${plantilla.tipo}`}
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Asunto del email"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Texto del email</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={restaurarTexto}
                disabled={disabled}
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar texto por defecto
              </Button>
            </div>
            <TiptapEditor
              key={editorKey}
              content={cuerpo}
              onChange={setCuerpo}
              disabled={disabled}
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium">
              Datos que podés insertar en el asunto o en el texto
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              Escribí el código tal cual y se reemplaza al enviar el email.
            </p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {variables.map((v) => (
                <li key={v.key} className="text-xs">
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    {`{{${v.key}}}`}
                  </code>{" "}
                  <span className="text-muted-foreground">{v.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Label>Archivo PDF adjunto (opcional)</Label>
            {adjunto ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={`/api/regimen/email-adjunto?file=${adjunto.fileName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                >
                  {adjunto.originalName}
                </a>
                <span className="text-muted-foreground">
                  {formatFileSize(adjunto.size)}
                </span>
                <div className="ml-auto flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                  >
                    Cambiar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAdjunto(null)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                    Quitar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="w-fit"
              >
                {uploading ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Subir PDF
                  </>
                )}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleUpload}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              Máximo 10MB. Se adjunta a cada email que se envíe con esta
              plantilla.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`activo-${plantilla.tipo}`}
              checked={activo}
              onCheckedChange={(checked) => setActivo(checked === true)}
              disabled={disabled}
            />
            <Label
              htmlFor={`activo-${plantilla.tipo}`}
              className="cursor-pointer font-normal"
            >
              Enviar este email automáticamente
            </Label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={disabled}>
              {saving ? <Spinner size="sm" /> : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
