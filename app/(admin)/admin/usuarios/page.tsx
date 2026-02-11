import { getUsers } from "@/actions/users";
import { UsuariosTable } from "./usuarios-table";

export default async function UsuariosPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">
          Gestiona los roles de los usuarios del sistema
        </p>
      </div>

      <UsuariosTable data={users} />
    </div>
  );
}
