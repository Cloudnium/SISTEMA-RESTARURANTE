// components/comprobantes/modals/ModalCambiarMetodoPago.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, X, Loader2, Check } from 'lucide-react';
import { Wallet, Smartphone, ArrowLeftRight, ScanLine, Banknote } from 'lucide-react';
import { B } from '@/lib/brand';
import { METODO_LABEL } from '@/constants/comprobantes/comprobantesConstants';
import type { MetodoPago } from '@/lib/supabase/types';
import type { CompDetalle } from '@/constants/comprobantes/comprobantesConstants';

interface Props {
  comp:     CompDetalle;
  onClose:  () => void;
  onGuardar: (metodo: MetodoPago) => Promise<void>;
}

const OPCIONES: Array<{ value: MetodoPago; icon: React.ElementType }> = [
  { value: 'efectivo',      icon: Banknote },
  { value: 'yape',          icon: Smartphone },
  { value: 'plin',          icon: Smartphone },
  { value: 'transferencia', icon: ArrowLeftRight },
  { value: 'tarjeta',       icon: CreditCard },
  { value: 'izipay',        icon: ScanLine },
];

export function ModalCambiarMetodoPago({ comp, onClose, onGuardar }: Props) {
  const [seleccion, setSeleccion] = useState<MetodoPago>(comp.metodo_pago);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const hayCambio = seleccion !== comp.metodo_pago;

  const handleGuardar = async () => {
    if (!hayCambio) { onClose(); return; }
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(seleccion);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el método de pago');
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(44,62,53,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md shadow-2xl"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: B.cream }}
            >
              <Wallet className="w-4 h-4" style={{ color: B.charcoal }} />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: B.charcoal }}>
                Cambiar Método de Pago
              </p>
              <p className="text-xs mt-0.5" style={{ color: B.muted }}>
                Comprobante <strong>{comp.numero}</strong>
              </p>
              <p className="text-xs" style={{ color: B.muted }}>
                Método actual: <strong>{METODO_LABEL[comp.metodo_pago]}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg shrink-0" style={{ color: B.muted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Opciones */}
        <div className="px-5 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {OPCIONES.map(({ value, icon: Icon }) => {
              const activo = seleccion === value;
              const esActual = comp.metodo_pago === value;
              return (
                <button
                  key={value}
                  onClick={() => setSeleccion(value)}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    background: activo ? '#e8f0fb' : B.cream,
                    color:      activo ? '#4A6FA5' : B.charcoal,
                    border:     activo ? '1px solid #4A6FA5' : '1px solid transparent',
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{METODO_LABEL[value]}</span>
                  {esActual && !activo && (
                    <span className="text-[9px] uppercase font-bold" style={{ color: B.muted }}>actual</span>
                  )}
                  {activo && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ background: '#fee2e2', color: B.terra }}>
              {error}
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || !hayCambio}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: B.charcoal, color: B.cream }}
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar cambio
          </button>
        </div>
      </div>
    </div>
  );
}