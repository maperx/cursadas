"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import { FileText, Upload, X } from "lucide-react";
import { REGIMEN_DOC_ALLOWED_TYPES } from "@/lib/regimen-especial";

export type UploadedDoc = {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
};

interface DocumentoUploaderProps {
  label: string;
  required?: boolean;
  value: UploadedDoc | null;
  onChange: (doc: UploadedDoc | null) => void;
  disabled?: boolean;
}

export function DocumentoUploader({
  label,
  required,
  value,
  onChange,
  disabled,
}: DocumentoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/regimen/documentos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast({
          title: "Error",
          description: data.error || "No se pudo subir el archivo",
          variant: "destructive",
        });
      } else {
        onChange({
          fileName: data.fileName,
          originalName: data.originalName,
          mimeType: data.mimeType,
          size: data.size,
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-sm">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {value ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-sm">{value.originalName}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start font-normal text-muted-foreground"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Subir archivo (PDF o imagen)
            </>
          )}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={REGIMEN_DOC_ALLOWED_TYPES.join(",")}
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}
