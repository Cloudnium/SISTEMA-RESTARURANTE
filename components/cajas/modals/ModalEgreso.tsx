// components/cajas/modals/ModalEgreso.tsx
'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import { registrarEgresoCaja } from '@/lib/supabase/queries';
import { fmtSoles } from '@/utils/cajas/cajasUtils';
import { EGRESO_ERROR_MESSAGES } from '@/constants/cajas/cajasConstants';
import type { Caja } from '@/lib/supabase/types';

interface ModalEgresoProps {
  caja:    Caja;
  onClose: () => void;
  onSaved: () => void;
}

export function ModalEgreso({ caja, onClose, onSaved }: ModalEgresoProps) {
  const { usuario }             = useAuth();
  const [concepto, setConcepto] = useState('');
  const [monto,    setMonto]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleRegistrar = async () => {
    if (!concepto.trim())                 { setError(EGRESO_ERROR_MESSAGES.sinConcepto); return; }
    if (!monto || parseFloat(monto) <= 0) { setError(EGRESO_ERROR_MESSAGES.sinMonto);   return; }
    if (parseFloat(monto) > caja.monto_actual) {
      setError(EGRESO_ERROR_MESSAGES.saldoInsuficiente(caja.monto_actual));
      return;
    }
    if (!usuario) return;

    setLoading(true);
    setError('');
    try {
      await registrarEgresoCaja(caja.id, concepto, parseFloat(monto), usuario.id);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar egreso');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    background: B.cream,
    border:     `1px solid ${B.creamDark}`,
    color:      B.charcoal,
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
            Registrar Egreso · {caja.nombre}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          {/* Saldo disponible */}
          <div
            className="rounded-xl px-4 py-3 flex justify-between items-center"
            style={{ background: `${B.green}10`, border: `1px solid ${B.green}25` }}
          >
            <span className="text-xs font-bold" style={{ color: B.green }}>Saldo disponible</span>
            <span className="text-base font-black" style={{ color: B.green }}>
              {fmtSoles(caja.monto_actual)}
            </span>
          </div>

          {/* Concepto */}
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Concepto
            </label>
            <input
              type="text"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              placeholder="Ej: Pago proveedor, Gastos varios…"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inp}
            />
          </div>

          {/* Monto */}
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Monto (S/)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inp}
            />
          </div>

          {error && (
            <p
              className="text-xs px-3 py-2 rounded-xl"
              style={{ background: '#fef0e6', color: B.terra }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}
          >
            Cancelar
          </button>
          <button
            onClick={handleRegistrar}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold
                       flex items-center justify-center gap-2"
            style={{ background: B.terra, color: B.cream }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Registrar egreso
          </button>
        </div>
      </div>
    </div>
  );
}