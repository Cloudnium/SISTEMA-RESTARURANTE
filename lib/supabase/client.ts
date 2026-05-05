// lib/supabase/client.ts
// Cliente singleton de Supabase para uso en el lado del cliente (browser).
// Para Server Components o Route Handlers usar createServerClient de @supabase/ssr.

import { createClient } from '@supabase/supabase-js';
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
export const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  // Zona horaria peruana en todas las consultas
  global: {
    headers: { 'x-tz': 'America/Lima' },
  },
});