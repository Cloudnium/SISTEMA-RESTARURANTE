// lib/auth/useCerrarSesionUsuario.ts
// Hook que el admin usa para forzar el cierre de sesión de un usuario.
// Uso: const { cerrarSesion, loading } = useCerrarSesionUsuario();
//      await cerrarSesion(usuarioId);

import { useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase/client';

interface UseCerrarSesionResult {
  cerrarSesion: (usuarioId: string) => Promise<{ ok: boolean; error?: string }>;
  loading: boolean;
}

export function useCerrarSesionUsuario(): UseCerrarSesionResult {
  const { usuario: admin } = useAuth();
  const [loading, setLoading] = useState(false);

  const cerrarSesion = useCallback(async (usuarioId: string) => {
    if (!admin || admin.rol !== 'admin') {
      return { ok: false, error: 'No autorizado: se requiere rol admin' };
    }

    setLoading(true);
    try {
      // 🔒 Se envía el token real de sesión del admin; la API lo verifica en
      //    el servidor (antes se confiaba en un admin_id que mandaba el
      //    cliente, fácil de falsificar).
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/sesiones/invalidar', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body:    JSON.stringify({ usuario_id: usuarioId }),
      });

      const json = await res.json();

      if (!res.ok) {
        return { ok: false, error: json.error ?? 'Error al cerrar sesión' };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    } finally {
      setLoading(false);
    }
  }, [admin]);

  return { cerrarSesion, loading };
}