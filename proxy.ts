import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { loadPermissions } from "@/lib/permissions-server";
import {
  can,
  canAccessAdmin,
  resourceForPath,
  visibleResources,
} from "@/lib/permissions";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Protected admin routes
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // El acceso al panel lo definen los permisos del usuario; el Superadmin
    // (SUPERADMIN_EMAILS) los tiene todos.
    const perms = await loadPermissions(session.user);

    if (!canAccessAdmin(perms)) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const resource = resourceForPath(pathname);
    if (resource && !can(perms, resource, "view")) {
      // Sin permiso de lectura sobre esta sección: se lo manda a la primera
      // sección que sí puede ver.
      const [primera] = visibleResources(perms);
      return NextResponse.redirect(
        new URL(primera?.href ?? "/admin", request.url)
      );
    }
  }

  // Protected student routes
  if (pathname.startsWith("/mis-cursadas")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.user.role !== "estudiante") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protected docente routes
  if (pathname.startsWith("/mis-catedras")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.user.role !== "docente") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Redirect logged-in users away from auth pages
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/mis-cursadas/:path*", "/mis-catedras/:path*", "/login", "/register", "/forgot-password", "/reset-password"],
};
