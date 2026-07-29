"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { updateUserRole } from "@/actions/users";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ShieldCheck } from "lucide-react";
import { PermisosDialog, type PermisosUsuario } from "./permisos-dialog";
import { RESOURCES } from "@/lib/permissions";

type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Sede = { id: string; name: string };

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  docente: "Docente",
  estudiante: "Estudiante",
};

function RoleSelector({ user }: { user: User }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = async (newRole: string) => {
    setIsLoading(true);
    try {
      await updateUserRole(user.id, newRole);
      toast({
        title: "Rol actualizado",
        description: `El rol de ${user.name} ha sido actualizado a ${newRole}`,
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Select
      value={user.role}
      onValueChange={handleRoleChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="docente">Docente</SelectItem>
        <SelectItem value="estudiante">Estudiante</SelectItem>
      </SelectContent>
    </Select>
  );
}

const PERMISOS_VACIOS: PermisosUsuario = {
  resources: {},
  cursadasPorSede: {},
};

/** Resumen corto de los permisos de un usuario para la tabla. */
function resumen(permisos: PermisosUsuario): string {
  const globales = RESOURCES.filter(
    (r) => !r.perSede && (permisos.resources[r.key] ?? []).length > 0
  ).length;
  const sedes = Object.values(permisos.cursadasPorSede).filter(
    (acciones) => acciones.length > 0
  ).length;

  if (globales === 0 && sedes === 0) return "Sin permisos";

  const partes: string[] = [];
  if (globales > 0) {
    partes.push(`${globales} ${globales === 1 ? "sección" : "secciones"}`);
  }
  if (sedes > 0) {
    partes.push(`cursadas en ${sedes} ${sedes === 1 ? "sede" : "sedes"}`);
  }
  return partes.join(" · ");
}

function buildColumns(options: {
  canEditRole: boolean;
  isSuperadmin: boolean;
  sedes: Sede[];
  permisos: Record<string, PermisosUsuario>;
  superadminEmails: string[];
}): ColumnDef<User>[] {
  const { canEditRole, isSuperadmin, sedes, permisos, superadminEmails } =
    options;

  const esSuperadmin = (user: User) =>
    superadminEmails.includes(user.email.toLowerCase());

  return [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.email}
          </div>
        </div>
      ),
    },
    {
      id: "verificado",
      header: "Email Verificado",
      cell: ({ row }) => (
        <Badge variant={row.original.emailVerified ? "success" : "secondary"}>
          {row.original.emailVerified ? "Verificado" : "Pendiente"}
        </Badge>
      ),
    },
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ row }) =>
        esSuperadmin(row.original) ? (
          <Badge className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Superadmin
          </Badge>
        ) : canEditRole ? (
          <RoleSelector user={row.original} />
        ) : (
          <Badge variant="secondary">
            {ROLE_LABELS[row.original.role] ?? row.original.role}
          </Badge>
        ),
    },
    // Los permisos solo los ve y los edita el Superadmin.
    ...(isSuperadmin
      ? [
          {
            id: "permisos",
            header: "Permisos",
            cell: ({ row }) => {
              if (esSuperadmin(row.original)) {
                return (
                  <span className="text-sm text-muted-foreground">
                    Todos los permisos
                  </span>
                );
              }
              if (row.original.role !== "admin") {
                return (
                  <span className="text-sm text-muted-foreground">
                    Sin acceso al panel
                  </span>
                );
              }
              const permisosUsuario =
                permisos[row.original.id] ?? PERMISOS_VACIOS;
              return (
                <PermisosDialog
                  user={row.original}
                  sedes={sedes}
                  permisos={permisosUsuario}
                >
                  <Button variant="outline" size="sm">
                    {resumen(permisosUsuario)}
                  </Button>
                </PermisosDialog>
              );
            },
          } satisfies ColumnDef<User>,
        ]
      : []),
    {
      id: "creado",
      header: "Registrado",
      cell: ({ row }) =>
        format(new Date(row.original.createdAt), "dd/MM/yyyy", { locale: es }),
    },
  ];
}

interface UsuariosTableProps {
  data: User[];
  canEditRole: boolean;
  isSuperadmin: boolean;
  sedes: Sede[];
  permisos: Record<string, PermisosUsuario>;
  superadminEmails: string[];
}

export function UsuariosTable({ data, ...options }: UsuariosTableProps) {
  return (
    <DataTable
      columns={buildColumns(options)}
      data={data}
      searchColumn="name"
      searchPlaceholder="Buscar usuario..."
      filters={[
        {
          column: "role",
          options: [
            { label: "Admin", value: "admin" },
            { label: "Docente", value: "docente" },
            { label: "Estudiante", value: "estudiante" },
          ],
          placeholder: "Todos los roles",
        },
      ]}
    />
  );
}
