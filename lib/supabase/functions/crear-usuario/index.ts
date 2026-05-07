// supabase/functions/crear-usuario/index.ts
// @ts-ignore: Deno types — ignorar en editor local, funciona en Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { nombre, email, password, rol, dni } = await req.json()

    if (!nombre || !email || !password || !rol) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore: Deno global
    const supabaseAdmin = createClient(
      // @ts-ignore: Deno global
      Deno.env.get('SUPABASE_URL')!,
      // @ts-ignore: Deno global
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verificar token del usuario que llama
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que quien llama es admin
    const { data: perfil } = await supabaseAdmin
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfil?.rol !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Solo administradores pueden crear usuarios' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Crear en auth.users — el trigger crea el perfil en public.usuarios automáticamente
    const { data: nuevoUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, rol },
    })

    if (createError) throw createError

    // Actualizar rol y dni porque el trigger solo pone 'cajero' por defecto
    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({ rol, dni: dni || null })
      .eq('id', nuevoUser.user.id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ id: nuevoUser.user.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})