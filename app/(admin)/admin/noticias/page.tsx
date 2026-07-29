import { getNoticias } from "@/actions/noticias";
import { NoticiasTable } from "./noticias-table";
import { NoticiaDialog } from "./noticia-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getPermissions } from "@/lib/auth-server";
import { can } from "@/lib/permissions";

export default async function NoticiasPage() {
  const perms = await getPermissions();
  const canEdit = can(perms, "noticias", "edit");
  const canDelete = can(perms, "noticias", "delete");

  const noticias = await getNoticias();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Noticias</h1>
          <p className="text-muted-foreground">
            Gestiona las noticias del sistema
          </p>
        </div>
        {canEdit && (
          <NoticiaDialog>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Noticia
            </Button>
          </NoticiaDialog>
        )}
      </div>

      <NoticiasTable data={noticias} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
