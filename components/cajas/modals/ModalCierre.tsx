// components/cajas/modals/ModalCierre.tsx
'use client';

import React, { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { B } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import { cerrarCaja } from '@/lib/supabase/queries';
import { fmtSoles } from '@/utils/cajas/cajasUtils';
import type { Caja } from '@/lib/supabase/types';

interface ModalCierreProps {
  caja:    Caja;
  onClose: () => void;
  onSaved: () => void;
}

export function ModalCierre({ caja, onClose, onSaved }: ModalCierreProps) {
  const { usuario }                 = useAuth();
  const [loading,    setLoading]    = useState(false);
  const [saldoFinal, setSaldoFinal] = useState<number | null>(null);
  const [error,      setError]      = useState('');

  const handleCerrar = async () => {
    if (!usuario) return;
    setLoading(true);
    setError('');
    try {
      const saldo = await cerrarCaja(caja.id, usuario.id);
      setSaldoFinal(saldo);
      setTimeout(() => { onSaved(); }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cerrar caja');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-sm shadow-2xl"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>
            Cerrar {caja.nombre}
          </h2>
        </div>

        <div className="p-6">
          {saldoFinal !== null ? (
            /* ── Estado: caja cerrada con éxito ── */
            <div className="flex flex-col items-center py-4 gap-3">
              <CheckCircle className="w-14 h-14" style={{ color: B.green }} />
              <p className="text-lg font-bold" style={{ color: B.charcoal }}>Caja cerrada</p>
              <div className="rounded-xl p-4 w-full text-center" style={{ background: B.cream }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: B.muted }}>
                  Saldo final
                </p>
                <p className="text-3xl font-black" style={{ color: B.green }}>
                  {fmtSoles(saldoFinal)}
                </p>
              </div>
            </div>
          ) : (
            /* ── Estado: confirmación ── */
            <>
              <div className="rounded-xl p-4 mb-4" style={{ background: B.cream }}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: B.muted }}>Saldo actual</span>
                  <span className="font-bold" style={{ color: B.charcoal }}>
                    {fmtSoles(caja.monto_actual)}
                  </span>
                </div>
                {caja.usuario && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: B.muted }}>Cajero</span>
                    <span className="font-semibold" style={{ color: B.charcoal }}>
                      {caja.usuario.nombre}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-center mb-4" style={{ color: B.muted }}>
                ¿Confirmas el cierre de esta caja?
              </p>

              {error && (
                <p
                  className="text-xs px-3 py-2 rounded-xl mb-3"
                  style={{ background: '#fef0e6', color: B.terra }}
                >
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: B.cream, color: B.charcoal }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCerrar}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold
                             flex items-center justify-center gap-2"
                  style={{ background: B.terra, color: B.cream }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cerrar caja
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}