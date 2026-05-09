// app/api/usuarios/[id]/route.ts
// DELETE /api/usuarios/:id — Elimina un usuario completamente de Auth + tabla pública
// Solo accesible desde el servidor (usa service_role key)

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

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  try {
    const supabaseAdmin = getAdminClient();

    // 1. Eliminar de Auth (cascade elimina la fila en public.usuarios si hay FK con ON DELETE CASCADE)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Por seguridad, intentar eliminar también de la tabla pública
    //    (por si el trigger no tiene CASCADE o hay datos huérfanos)
    await supabaseAdmin.from('usuarios').delete().eq('id', id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API usuarios DELETE]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 },
    );
  }
}
