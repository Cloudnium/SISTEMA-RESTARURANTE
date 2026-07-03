// Ejemplo de uso en tu pantalla de Usuarios o Cajas
// Fragmento para insertar el botón "Cerrar sesión" en la tabla de usuarios

'use client';

import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { useCerrarSesionUsuario } from '@/lib/auth/useCerrarSesionUsuario';
import type { Usuario } from '@/lib/supabase/types';

interface BtnCerrarSesionProps {
  usuario: Usuario;
  onSuccess?: () => void;
}

export function BtnCerrarSesion({ usuario, onSuccess }: BtnCerrarSesionProps) {
  const { cerrarSesion, loading } = useCerrarSesionUsuario();
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const handleClick = async () => {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }

    setMensaje('');
    const resultado = await cerrarSesion(usuario.id);

    if (resultado.ok) {
      setMensaje('Sesión cerrada exitosamente.');
      setConfirmando(false);
      onSuccess?.();
    } else {
      setMensaje(resultado.error ?? 'Error desconocido');
      setConfirmando(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title={confirmando ? `¿Confirmar cierre de sesión de ${usuario.nombre}?` : 'Cerrar sesión activa'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{
          background: confirmando ? B.terra : `${B.terra}18`,
          color:      confirmando ? B.cream : B.terra,
          cursor:     loading ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={e => {
          if (!confirmando && !loading) e.currentTarget.style.background = `${B.terra}30`;
        }}
        onMouseLeave={e => {
          if (!confirmando) e.currentTarget.style.background = `${B.terra}18`;
        }}
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <LogOut className="w-3.5 h-3.5" />
        }
        {confirmando ? '¿Confirmar?' : 'Cerrar sesión'}
      </button>

      {/* Cancelar confirmación */}
      {confirmando && !loading && (
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="text-xs underline"
          style={{ color: B.muted }}
        >
          Cancelar
        </button>
      )}

      {mensaje && (
        <p className="text-xs mt-0.5" style={{ color: mensaje.includes('xito') ? B.green : B.terra }}>
          {mensaje}
        </p>
      )}
    </div>
  );
}

// ─── Cómo usar en tu tabla de usuarios ───────────────────────────────────────
// En la fila de cada usuario:
//
// <BtnCerrarSesion
//   usuario={usuario}
//   onSuccess={() => toast.success(`Sesión de ${usuario.nombre} cerrada`)}
// />
//
// Solo se mostrará para admins (el hook internamente valida el rol).
// El usuario objetivo detectará el cierre en ≤ 2 minutos y será
// redirigido automáticamente a /login.