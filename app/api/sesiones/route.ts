// app/api/sesiones/route.ts
// POST  → Registra una nueva sesión activa en public.sesiones
// DELETE → Cierra la sesión actual (por token)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan variables de entorno de Supabase');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── POST /api/sesiones — Crear sesión ───────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usuario_id, token } = body;

    if (!usuario_id || !token) {
      return NextResponse.json(
        { error: 'usuario_id y token son obligatorios' },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();

    // Obtener IP y User-Agent del request
    const ip        = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                   ?? req.headers.get('x-real-ip')
                   ?? 'unknown';
    const userAgent = req.headers.get('user-agent') ?? 'unknown';

    // Insertar nueva sesión activa
    const { data, error } = await supabase
      .from('sesiones')
      .insert({
        usuario_id,
        token,
        activa:           true,
        ip_address:       ip,
        user_agent:       userAgent,
        ultima_actividad: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[API sesiones POST]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sesion_id: data.id }, { status: 201 });
  } catch (err) {
    console.error('[API sesiones POST] Error inesperado:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/sesiones — Cerrar sesión por token ──────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'token es obligatorio' }, { status: 400 });
    }

    const supabase = getAdminClient();

    await supabase
      .from('sesiones')
      .update({
        activa:       false,
        fecha_cierre: new Date().toISOString(),
      })
      .eq('token', token)
      .eq('activa', true);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API sesiones DELETE]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 },
    );
  }
}