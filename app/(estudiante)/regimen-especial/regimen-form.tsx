"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import { createSolicitudRegimen } from "@/actions/regimen-especial";
import {
  DOC_GENERALES,
  DOC_LABORALES,
  DOC_PERSONAS,
  DOC_TIPO_LABELS,
  MOTIVO_LABELS,
  REGIMEN_MOTIVOS,
  REGIMEN_SEDES,
  SEDE_LABELS,
  motivoIncluyeLaboral,
  motivoIncluyePersonas,
  soloNumeros,
  type RegimenDocTipo,
  type RegimenMotivo,
} from "@/lib/regimen-especial";
import { DocumentoUploader, type UploadedDoc } from "./documento-uploader";

type Carrera = { id: string; name: string; color: string };
type Asignatura = { id: string; name: string; carreraId: string };

interface RegimenFormProps {
  carreras: Carrera[];
  asignaturas: Asignatura[];
}

export function RegimenForm({ carreras, asignaturas }: RegimenFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [motivo, setMotivo] = useState<RegimenMotivo | "">("");
  const [sede, setSede] = useState("");
  const [carreraId, setCarreraId] = useState("");
  // Asignaturas marcadas → comisión en la que el estudiante está inscripto.
  // La clave presente en el objeto es lo que marca la asignatura seleccionada.
  const [comisiones, setComisiones] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<Record<string, UploadedDoc | null>>({});

  const setDoc = (tipo: RegimenDocTipo, doc: UploadedDoc | null) =>
    setDocs((prev) => ({ ...prev, [tipo]: doc }));

  const asignaturasDeCarrera = useMemo(
    () => asignaturas.filter((a) => a.carreraId === carreraId),
    [asignaturas, carreraId]
  );

  const toggleAsignatura = (id: string) =>
    setComisiones((prev) => {
      if (!(id in prev)) return { ...prev, [id]: "" };
      const rest = { ...prev };
      delete rest[id];
      return rest;
    });

  const setComision = (id: string, value: string) =>
    setComisiones((prev) => ({ ...prev, [id]: soloNumeros(value) }));

  const handleCarreraChange = (value: string) => {
    setCarreraId(value);
    setComisiones({});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    formData.set("motivo", motivo);
    formData.set("sede", sede);
    formData.set("carreraId", carreraId);
    formData.set(
      "asignaturas",
      JSON.stringify(
        Object.entries(comisiones).map(([asignaturaId, comision]) => ({
          asignaturaId,
          comision,
        }))
      )
    );

    const documentos = Object.entries(docs)
      .filter(([, v]) => v)
      .map(([tipo, v]) => ({ tipo, ...(v as UploadedDoc) }));
    formData.set("documentos", JSON.stringify(documentos));

    const result = await createSolicitudRegimen(formData);

    if (result.error) {
      setErrors(result.error as Record<string, string[]>);
      setIsLoading(false);
      toast({
        title: "Revisá el formulario",
        description: "Hay datos faltantes o inválidos.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Solicitud enviada",
      description: "Tu solicitud quedó registrada y está pendiente de revisión.",
      variant: "success",
    });
    setIsLoading(false);
    router.refresh();
  };

  const showLaboral = motivo && motivoIncluyeLaboral(motivo);
  const showPersonas = motivo && motivoIncluyePersonas(motivo);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Datos personales */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Datos personales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="apellidos">Apellidos</Label>
            <Input id="apellidos" name="apellidos" disabled={isLoading} />
            {errors.apellidos && (
              <p className="text-sm text-destructive">{errors.apellidos[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombres">Nombres</Label>
            <Input id="nombres" name="nombres" disabled={isLoading} />
            {errors.nombres && (
              <p className="text-sm text-destructive">{errors.nombres[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input id="dni" name="dni" inputMode="numeric" disabled={isLoading} />
            {errors.dni && (
              <p className="text-sm text-destructive">{errors.dni[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              name="telefono"
              inputMode="tel"
              disabled={isLoading}
            />
            {errors.telefono && (
              <p className="text-sm text-destructive">{errors.telefono[0]}</p>
            )}
          </div>
        </div>
      </section>

      {/* Situación */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Situación</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select
              value={motivo}
              onValueChange={(v) => setMotivo(v as RegimenMotivo)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent>
                {REGIMEN_MOTIVOS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MOTIVO_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.motivo && (
              <p className="text-sm text-destructive">{errors.motivo[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Sede</Label>
            <Select value={sede} onValueChange={setSede} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sede" />
              </SelectTrigger>
              <SelectContent>
                {REGIMEN_SEDES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SEDE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sede && (
              <p className="text-sm text-destructive">{errors.sede[0]}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Carrera</Label>
            <Select
              value={carreraId}
              onValueChange={handleCarreraChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar carrera" />
              </SelectTrigger>
              <SelectContent>
                {carreras.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.carreraId && (
              <p className="text-sm text-destructive">{errors.carreraId[0]}</p>
            )}
          </div>
        </div>
      </section>

      {/* Asignaturas */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Asignaturas en las que te inscribiste a cursar
        </h2>
        <p className="text-sm text-muted-foreground">
          Marcá cada asignatura e indicá el número de comisión en la que estás
          inscripto. Si más adelante pedís un cambio de comisión, se usará ese
          número como comisión de origen.
        </p>
        <div className="rounded-md border p-3 max-h-72 overflow-y-auto space-y-2">
          {!carreraId ? (
            <p className="text-sm text-muted-foreground">
              Seleccioná primero una carrera.
            </p>
          ) : asignaturasDeCarrera.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay asignaturas disponibles para esta carrera.
            </p>
          ) : (
            asignaturasDeCarrera.map((a) => {
              const seleccionada = a.id in comisiones;
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
                >
                  <Checkbox
                    id={`asig-${a.id}`}
                    checked={seleccionada}
                    onCheckedChange={() => toggleAsignatura(a.id)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor={`asig-${a.id}`}
                    className="flex-1 text-sm cursor-pointer"
                  >
                    {a.name}
                  </label>
                  {seleccionada && (
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`comision-${a.id}`}
                        className="text-xs text-muted-foreground"
                      >
                        Comisión
                      </Label>
                      <Input
                        id={`comision-${a.id}`}
                        className="h-8 w-20"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Ej: 1"
                        value={comisiones[a.id]}
                        onChange={(e) => setComision(a.id, e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        {errors.asignaturas && (
          <p className="text-sm text-destructive">{errors.asignaturas[0]}</p>
        )}
      </section>

      {/* Documentación */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Documentación</h2>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Documentación general (obligatoria)
          </p>
          {DOC_GENERALES.map((tipo) => (
            <DocumentoUploader
              key={tipo}
              label={DOC_TIPO_LABELS[tipo]}
              required
              value={docs[tipo] ?? null}
              onChange={(doc) => setDoc(tipo, doc)}
              disabled={isLoading}
            />
          ))}
        </div>

        {showLaboral && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Situación laboral (adjuntá al menos uno)
            </p>
            {DOC_LABORALES.map((tipo) => (
              <DocumentoUploader
                key={tipo}
                label={DOC_TIPO_LABELS[tipo]}
                value={docs[tipo] ?? null}
                onChange={(doc) => setDoc(tipo, doc)}
                disabled={isLoading}
              />
            ))}
          </div>
        )}

        {showPersonas && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Personas a cargo (adjuntá al menos uno)
            </p>
            {DOC_PERSONAS.map((tipo) => (
              <DocumentoUploader
                key={tipo}
                label={DOC_TIPO_LABELS[tipo]}
                value={docs[tipo] ?? null}
                onChange={(doc) => setDoc(tipo, doc)}
                disabled={isLoading}
              />
            ))}
          </div>
        )}

        {errors.documentos && (
          <div className="space-y-1">
            {errors.documentos.map((msg, i) => (
              <p key={i} className="text-sm text-destructive">
                {msg}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* Observaciones */}
      <section className="space-y-2">
        <Label htmlFor="observaciones">Observaciones (opcional)</Label>
        <Textarea
          id="observaciones"
          name="observaciones"
          rows={4}
          placeholder="Cualquier aclaración que quieras agregar..."
          disabled={isLoading}
        />
      </section>

      {errors.general && (
        <p className="text-sm text-destructive">{errors.general[0]}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner size="sm" /> : "Enviar solicitud"}
        </Button>
      </div>
    </form>
  );
}
