// components/cajas/modals/ModalApertura.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import { abrirCaja } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';
import type { Caja } from '@/lib/supabase/types';

// Helper tipado
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface ModalAperturaProps {
  caja:    Caja;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Abre la caja con monto inicial S/ 0.00 sin confirmación.
 * Usa useRef para evitar doble llamada en StrictMode.
 * setState solo se llama dentro de callbacks asíncronos.
 */
export function ModalApertura({ caja, onClose, onSaved }: ModalAperturaProps) {
  const { usuario }           = useAuth();
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const iniciado              = useRef(false);

  useEffect(() => {
    if (iniciado.current || !usuario) return;
    iniciado.current = true;

    abrirCaja(caja.id, usuario.id, 0)
      .then(() =>
        db.from('cajas')
          .update({ usuario_id: usuario.id })
          .eq('id', caja.id)
      )
      .then(() => { onSaved(); })
      .catch((e: unknown) => {
        setLoading(false);
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        setError(msg);
        console.error('Error completo al abrir caja:', e);
      });
  // usuario y caja.id son estables durante el ciclo de vida del modal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={!loading ? onClose : undefined}
    >
      <div
        className="rounded-2xl w-full max-w-xs shadow-2xl flex flex-col items-center py-10 gap-4"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        {error ? (
          <>
            <p className="text-sm font-bold px-6 text-center" style={{ color: B.terra }}>
              {error}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: B.cream, color: B.charcoal }}
            >
              Cerrar
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
            <p className="text-sm font-semibold" style={{ color: B.muted }}>
              Abriendo {caja.nombre}…
            </p>
          </>
        )}
      </div>
    </div>
  );
}