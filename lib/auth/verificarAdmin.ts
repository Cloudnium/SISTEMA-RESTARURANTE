// lib/auth/verificarAdmin.ts
// Helper SERVER-ONLY (usar solo dentro de app/api/**/route.ts).
// Verifica que la petición traiga un token de sesión válido de Supabase Auth
// (header "Authorization: Bearer <access_token>") y que el usuario dueño de
// ese token tenga rol 'admin' en public.usuarios.
//
// Esto evita que cualquiera pueda llamar directamente (curl/Postman) a las
// rutas que usan SUPABASE_SERVICE_ROLE_KEY sin haber iniciado sesión como admin.

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface UsuarioVerificado {
  id:  string;
  rol: string;
}

export interface ResultadoVerificacion {
  ok:       boolean;
  status:   number;
  error?:   string;
  usuario?: UsuarioVerificado;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan variables de entorno de Supabase');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Verifica que quien llama esté autenticado Y tenga rol admin.
 * Devuelve { ok: false, status, error } listo para responder con NextResponse.json(...).
 */
export async function verificarAdmin(req: NextRequest): Promise<ResultadoVerificacion> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return { ok: false, status: 401, error: 'No autenticado: falta el token de sesión' };
  }

  const admin = getAdminClient();

  // Verifica que el token sea un JWT de Supabase Auth válido y no expirado
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return { ok: false, status: 401, error: 'Sesión inválida o expirada' };
  }

  // Verifica el rol en la tabla de perfiles
  const { data: perfil, error: perfilError } = await admin
    .from('usuarios')
    .select('id, rol')
    .eq('id', userData.user.id)
    .single();

  if (perfilError || !perfil) {
    return { ok: false, status: 403, error: 'No autorizado' };
  }

  if (perfil.rol !== 'admin') {
    return { ok: false, status: 403, error: 'No autorizado: se requiere rol admin' };
  }

  return { ok: true, status: 200, usuario: { id: perfil.id, rol: perfil.rol } };
}