"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
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

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-xs text-muted-foreground">{row.original.email}</div>
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
    id: "rol",
    header: "Rol",
    cell: ({ row }) => <RoleSelector user={row.original} />,
  },
  {
    id: "creado",
    header: "Registrado",
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "dd/MM/yyyy", { locale: es }),
  },
];

interface UsuariosTableProps {
  data: User[];
}

export function UsuariosTable({ data }: UsuariosTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumn="name"
      searchPlaceholder="Buscar usuario..."
    />
  );
}
