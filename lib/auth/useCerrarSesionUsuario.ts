// lib/auth/useCerrarSesionUsuario.ts
// Hook que el admin usa para forzar el cierre de sesión de un usuario.
// Uso: const { cerrarSesion, loading } = useCerrarSesionUsuario();
//      await cerrarSesion(usuarioId);

import { useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

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
      const res = await fetch('/api/sesiones/invalidar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ usuario_id: usuarioId, admin_id: admin.id }),
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