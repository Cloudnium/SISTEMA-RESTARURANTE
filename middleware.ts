// middleware.ts
// Protección de rutas a nivel de SERVIDOR — corre antes de renderizar cualquier página.
// Complementa (no reemplaza) el RLS de Supabase: RLS protege los DATOS,
// esto protege qué PÁGINAS se pueden siquiera cargar.
//
// Sin sesión válida → redirige a /login.
// Con sesión válida → no puede volver a ver /login.
// /register → requiere sesión (la página y la API ya validan que sea admin;
//             esto evita que alguien sin sesión vea el HTML del formulario).

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Rutas que cualquiera puede ver sin haber iniciado sesión
const RUTAS_PUBLICAS = ['/login'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: usar getUser() (valida el token contra Supabase Auth),
  // nunca getSession() aquí — getSession() solo lee la cookie sin verificarla.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const esRutaPublica = RUTAS_PUBLICAS.some(r => path === r || path.startsWith(`${r}/`));

  // Sin sesión válida y pidiendo una ruta protegida → a /login
  if (!user && !esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Con sesión válida y pidiendo /login → al inicio (ya no tiene sentido verlo)
  if (user && esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

// No corre sobre archivos estáticos, imágenes ni la carpeta de íconos —
// solo sobre páginas y rutas de la app.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};