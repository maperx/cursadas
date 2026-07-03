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
import {
  LogIn,
  LogOut,
  Newspaper,
  Settings,
  User,
  BookOpen,
  ScrollText,
  ExternalLink,
  Menu,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";

type NavLink = { href: string; label: string; icon: LucideIcon };

const EXTERNAL_LINKS = [
  { href: "https://fcvsvirtual.entrerios.gov.ar/", label: "Campus Virtual" },
  { href: "https://guarani3w.uader.edu.ar/", label: "SIU Guaraní" },
];

export function PublicHeader() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const role = session?.user.role;

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  const navLinks: NavLink[] = [
    { href: "/noticias", label: "Noticias", icon: Newspaper },
  ];
  if (session) {
    if (role === "estudiante") {
      navLinks.push({ href: "/mis-cursadas", label: "Mis Cursadas", icon: BookOpen });
      navLinks.push({ href: "/regimen-especial", label: "Régimen especial", icon: ScrollText });
    }
    if (role === "docente") {
      navLinks.push({ href: "/mis-catedras", label: "Mis Cátedras", icon: BookOpen });
    }
    if (role === "admin") {
      navLinks.push({ href: "/admin", label: "Admin", icon: Settings });
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <Image
            src="/logo.png"
            alt="logo FCVS"
            width={150}
            height={46}
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" asChild>
              <Link href={link.href}>
                <link.icon className="mr-2 h-4 w-4" />
                {link.label}
              </Link>
            </Button>
          ))}
          {session ? (
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              onSignOut={handleSignOut}
            />
          ) : !isPending ? (
            <>
              {EXTERNAL_LINKS.map((link) => (
                <Button key={link.href} variant="outline" size="sm" asChild>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {link.label}
                  </a>
                </Button>
              ))}
              <Button size="sm" asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Ingresar
                </Link>
              </Button>
            </>
          ) : null}
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-1 md:hidden">
          {session ? (
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              onSignOut={handleSignOut}
            />
          ) : !isPending ? (
            <Button size="sm" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ingresar</span>
              </Link>
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {navLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>
                    <link.icon className="mr-2 h-4 w-4" />
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              {!session && !isPending && (
                <>
                  <DropdownMenuSeparator />
                  {EXTERNAL_LINKS.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {link.label}
                      </a>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function UserMenu({
  name,
  email,
  onSignOut,
}: {
  name: string;
  email: string;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <User className="h-5 w-5" />
          <span className="sr-only">Perfil</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="text-xs leading-none text-muted-foreground">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
