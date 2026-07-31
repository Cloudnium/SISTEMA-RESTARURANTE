// app/api/sesiones/invalidar/route.ts
// POST /api/sesiones/invalidar
// Solo admins. Invalida TODAS las sesiones activas de un usuario (fuerza logout).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verificarAdmin } from '@/lib/auth/verificarAdmin';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan variables de entorno de Supabase');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    // 🔒 Solo un admin autenticado puede invalidar sesiones de otros usuarios.
    // (antes esto se "verificaba" con un admin_id que mandaba el propio cliente
    // en el body — cualquiera podía inventar ese valor. Ahora se verifica el
    // token real de Supabase Auth del que hace la petición.)
    const verificacion = await verificarAdmin(req);
    if (!verificacion.ok) {
      return NextResponse.json({ error: verificacion.error }, { status: verificacion.status });
    }

    const body = await req.json();
    const { usuario_id } = body;

    if (!usuario_id) {
      return NextResponse.json({ error: 'usuario_id es obligatorio' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Invalidar todas las sesiones activas del usuario objetivo
    const { error } = await supabase.rpc('fn_invalidar_sesiones_usuario', {
      p_usuario_id: usuario_id,
    });

    if (error) {
      console.error('[API sesiones/invalidar]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API sesiones/invalidar]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 },
    );
  }
}