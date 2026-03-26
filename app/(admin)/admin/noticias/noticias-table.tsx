"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { NoticiaDialog } from "./noticia-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, PanelRight, SlidersHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteNoticia } from "@/actions/noticias";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Noticia = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  sidebar: boolean;
  visible: boolean;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const columns: ColumnDef<Noticia>[] = [
  {
    accessorKey: "title",
    header: "Título",
  },
  {
    accessorKey: "publishedAt",
    header: "Fecha",
    cell: ({ row }) =>
      format(new Date(row.original.publishedAt), "dd/MM/yyyy", { locale: es }),
  },
  {
    accessorKey: "imageUrl",
    header: "Imagen",
    cell: ({ row }) =>
      row.original.imageUrl ? (
        <img
          src={row.original.imageUrl}
          alt=""
          className="h-10 w-16 object-cover rounded"
        />
      ) : (
        <span className="text-muted-foreground text-sm">Sin imagen</span>
      ),
  },
  {
    accessorKey: "sidebar",
    header: "Ubicación",
    cell: ({ row }) =>
      row.original.sidebar ? (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <PanelRight className="h-4 w-4" />
          Panel lateral
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          Carousel
        </div>
      ),
  },
  {
    accessorKey: "visible",
    header: "Visible",
    cell: ({ row }) =>
      row.original.visible ? (
        <Eye className="h-4 w-4 text-muted-foreground" />
      ) : (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <NoticiaDialog noticia={row.original}>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </NoticiaDialog>
        <DeleteDialog
          title="Eliminar Noticia"
          description={`¿Estás seguro de que deseas eliminar la noticia "${row.original.title}"? Esta acción no se puede deshacer.`}
          onConfirm={() => deleteNoticia(row.original.id)}
        >
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </DeleteDialog>
      </div>
    ),
  },
];

interface NoticiasTableProps {
  data: Noticia[];
}

export function NoticiasTable({ data }: NoticiasTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumn="title"
      searchPlaceholder="Buscar noticia..."
    />
  );
}
