import { Skeleton } from "@/components/ui/skeleton";

interface TableLoadingProps {
  title?: string;
  description?: string;
  buttonText?: string;
}

export function TableLoading({
  title = "Cargando",
  description = "Cargando datos...",
  buttonText = "Nuevo",
}: TableLoadingProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-9 w-64" />
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
