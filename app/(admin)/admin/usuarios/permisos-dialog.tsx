"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import { updateUserPermissions } from "@/actions/permissions";
import {
  RESOURCES,
  type PermissionAction,
  type ResourceKey,
} from "@/lib/permissions";

export type PermisosUsuario = {
  resources: Partial<Record<ResourceKey, PermissionAction[]>>;
  cursadasPorSede: Record<string, PermissionAction[]>;
};

type Sede = { id: string; name: string };

interface PermisosDialogProps {
  children: React.ReactNode;
  user: { id: string; name: string; email: string };
  sedes: Sede[];
  permisos: PermisosUsuario;
}

/** Alta/baja de una acción dentro de una lista de acciones. */
function toggle(
  actions: PermissionAction[] | undefined,
  action: PermissionAction,
  checked: boolean
): PermissionAction[] {
  const actuales = new Set(actions ?? []);
  if (checked) {
    actuales.add(action);
  } else {
    actuales.delete(action);
  }
  return [...actuales];
}

export function PermisosDialog({
  children,
  user,
  sedes,
  permisos,
}: PermisosDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resources, setResources] = useState(permisos.resources);
  const [cursadasPorSede, setCursadasPorSede] = useState(
    permisos.cursadasPorSede
  );

  // Al reabrir el diálogo se parte de lo que hay guardado.
  const handleOpenChange = (value: boolean) => {
    if (value) {
      setResources(permisos.resources);
      setCursadasPorSede(permisos.cursadasPorSede);
    }
    setOpen(value);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateUserPermissions({
        userId: user.id,
        resources,
        cursadasPorSede,
      });
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Permisos actualizados",
          description: `Se guardaron los permisos de ${user.name}.`,
          variant: "success",
        });
        setOpen(false);
        router.refresh();
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron guardar los permisos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permisos de {user.name}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Sin permiso de <strong>ver</strong> la sección no aparece en el panel.
          <strong> Editar</strong> incluye crear.
        </p>

        <div className="space-y-4">
          {RESOURCES.map((resource) => (
            <div key={resource.key} className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">{resource.label}</p>

              {resource.perSede ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Los permisos de cursadas se otorgan por sede.
                  </p>
                  {sedes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay sedes cargadas.
                    </p>
                  ) : (
                    sedes.map((sede) => (
                      <div
                        key={sede.id}
                        className="flex flex-wrap items-center gap-4 border-t pt-2 first:border-t-0 first:pt-0"
                      >
                        <span className="w-40 text-sm">{sede.name}</span>
                        {resource.actions.map((action) => (
                          <label
                            key={action.key}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={(
                                cursadasPorSede[sede.id] ?? []
                              ).includes(action.key)}
                              onCheckedChange={(checked) =>
                                setCursadasPorSede((prev) => ({
                                  ...prev,
                                  [sede.id]: toggle(
                                    prev[sede.id],
                                    action.key,
                                    !!checked
                                  ),
                                }))
                              }
                            />
                            {action.label}
                          </label>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  {resource.actions.map((action) => (
                    <label
                      key={action.key}
                      className="flex items-center gap-2 text-sm"
                      title={action.hint}
                    >
                      <Checkbox
                        checked={(resources[resource.key] ?? []).includes(
                          action.key
                        )}
                        onCheckedChange={(checked) =>
                          setResources((prev) => ({
                            ...prev,
                            [resource.key]: toggle(
                              prev[resource.key],
                              action.key,
                              !!checked
                            ),
                          }))
                        }
                      />
                      {action.label}
                      {action.hint && (
                        <span className="text-xs text-muted-foreground">
                          ({action.hint})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
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
          <Button type="button" onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : "Guardar permisos"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
