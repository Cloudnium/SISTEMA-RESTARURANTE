// lib/supabase/client.ts
// Cliente singleton de Supabase para uso en el lado del cliente (browser).
// Para Server Components o Route Handlers usar createServerClient de @supabase/ssr.
//
// 🔒 Usa createBrowserClient (en vez de createClient de supabase-js) para que
//    la sesión también se guarde en cookies, no solo en localStorage. Esto es
//    lo que permite que middleware.ts (que corre en el servidor) pueda leer
//    la sesión y proteger rutas — localStorage no es accesible desde ahí.
//    La API del cliente resultante es 100% compatible con la anterior
//    (mismos supabase.auth.*, supabase.from(), supabase.channel(), etc.).

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    '❌ Faltan variables de entorno de Supabase.\n' +
    'Crea un archivo .env.local con:\n' +
    '  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\n' +
    '  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...'
  );
}

// Singleton — se crea una sola vez en el módulo
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  // Zona horaria peruana en todas las consultas
  global: {
    headers: { 'x-tz': 'America/Lima' },
  },
});