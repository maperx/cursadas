import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Building2,
  GraduationCap,
  DoorOpen,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

const stats = [
  {
    title: "Carreras",
    href: "/admin/carreras",
    icon: GraduationCap,
    color: "text-blue-500",
  },
  {
    title: "Asignaturas",
    href: "/admin/asignaturas",
    icon: BookOpen,
    color: "text-green-500",
  },
{
    title: "Aulas",
    href: "/admin/aulas",
    icon: DoorOpen,
    color: "text-cyan-500",
  },
  {
    title: "Cursadas",
    href: "/admin/cursadas",
    icon: Building2,
    color: "text-red-500",
  },
  {
    title: "Inscripciones",
    href: "/admin/inscripciones",
    icon: ClipboardList,
    color: "text-yellow-500",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel principal</h1>
        <p className="text-muted-foreground">
          Bienvenido al panel de administración
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.href} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Gestionar {stat.title.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
