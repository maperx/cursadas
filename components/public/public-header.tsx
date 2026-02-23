"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, Settings, User, BookOpen, ExternalLink } from "lucide-react";
import Image from "next/image";

export function PublicHeader() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 m-2">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="/logo.png"
            alt="logo FCVS"
            width={150}
            height={46}
            className="ml-auto"
          />
          {/* <span className="hidden sm:inline"> Facultad de Ciencias de la Vida y la Salud - UADER</span> */}
        </Link>

        <nav className="flex items-center gap-2">
          {session ? (
            <>
              {session.user.role === "estudiante" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/mis-cursadas">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Mis Cursadas
                  </Link>
                </Button>
              )}
              {session.user.role === "admin" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin">
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : !isPending ? (
            <>
              <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                <a href="https://fcvsvirtual.entrerios.gov.ar/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Campus Virtual
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                <a href="https://guarani3w.uader.edu.ar/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  SIU Guaraní
                </a>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Ingresar
                </Link>
              </Button>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
