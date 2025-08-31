import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

// Rotas que não precisam de autenticação
const publicRoutes = ["/login", "/register", "/", "/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("Middleware executando para:", pathname);

  // Verificar se é uma rota pública
  if (publicRoutes.includes(pathname)) {
    console.log("Rota pública, permitindo acesso");
    return NextResponse.next();
  }

  // Verificar se é uma rota da API (permitir acesso)
  if (pathname.startsWith("/api/")) {
    console.log("Rota da API, permitindo acesso");
    return NextResponse.next();
  }

  // Verificar se é uma rota de assets estáticos
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon.ico")) {
    console.log("Asset estático, permitindo acesso");
    return NextResponse.next();
  }

  // Verificar token de autenticação
  const token = request.cookies.get("auth-token");
  console.log("Token encontrado:", !!token);

  if (!token) {
    console.log("Sem token, redirecionando para login");
    // Redirecionar para login se não estiver autenticado
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    console.log("Verificando token...");
    // Verificar JWT usando jose
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token.value, secret);
    console.log("Token válido, payload:", payload);

    // Token válido, permitir acesso
    return NextResponse.next();
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    // Token inválido, redirecionar para login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);

    // Remover cookie inválido
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("auth-token");

    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
