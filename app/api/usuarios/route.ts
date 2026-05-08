// app/api/usuarios/route.ts
// API Route segura para crear usuarios sin iniciar sesión automáticamente.
// Usa SUPABASE_SERVICE_ROLE_KEY (solo disponible en el servidor) — nunca hace auto-login.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente admin con service_role — SOLO usar en server-side (API routes, Server Actions)
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan variables de entorno de Supabase');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── POST /api/usuarios — Crear nuevo usuario ─────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, email, password, rol, dni, caja_id, activo } = body;

    // Validaciones básicas en el servidor
    if (!nombre?.trim())    return NextResponse.json({ error: 'El nombre es obligatorio' },    { status: 400 });
    if (!email?.trim())     return NextResponse.json({ error: 'El email es obligatorio' },     { status: 400 });
    if (!password)          return NextResponse.json({ error: 'La contraseña es obligatoria' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });

    const supabaseAdmin = getAdminClient();

    // 1. Crear en Auth con admin.createUser — NO inicia sesión automáticamente
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password,
      email_confirm: true, // confirmar email automáticamente (sistema interno)
      user_metadata: { nombre: nombre.trim(), rol },
    });

    if (authError) {
      // Mensajes de error amigables
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Este correo ya está registrado en el sistema' }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'No se pudo crear el usuario en Auth' }, { status: 500 });
    }

    // 2. Actualizar el perfil en public.usuarios (el trigger ya creó la fila)
    //    Pequeña espera para que el trigger de Supabase se ejecute primero
    await new Promise(r => setTimeout(r, 500));

    const { error: profileError } = await supabaseAdmin
      .from('usuarios')
      .update({
        nombre:  nombre.trim(),
        rol:     rol ?? 'cajero',
        dni:     dni?.trim() || null,
        caja_id: caja_id || null,
        activo:  activo ?? true,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      // No es fatal — el usuario en Auth ya fue creado correctamente
      console.warn('[API usuarios] Advertencia al actualizar perfil:', profileError.message);
    }

    return NextResponse.json({ ok: true, userId: authData.user.id }, { status: 201 });

  } catch (error) {
    console.error('[API usuarios] Error inesperado:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

// ─── PATCH /api/usuarios — Cambiar contraseña de otro usuario ────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, password } = body;

    if (!userId)              return NextResponse.json({ error: 'userId es obligatorio' }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });

    const supabaseAdmin = getAdminClient();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[API usuarios PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
