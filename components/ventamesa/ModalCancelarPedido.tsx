// components/venta-mesa/ModalCancelarPedido.tsx
'use client';

import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { B } from '@/lib/brand';

interface ModalCancelarPedidoProps {
  nombreMesa:  string;
  onConfirmar: () => Promise<void>;
  onCerrar:    () => void;
}

export function ModalCancelarPedido({ nombreMesa, onConfirmar, onCerrar }: ModalCancelarPedidoProps) {
  const [cancelando, setCancelando] = useState(false);
  const [error,      setError]      = useState('');

  const handleConfirmar = async () => {
    setCancelando(true);
    setError('');
    try {
      await onConfirmar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar el pedido');
      setCancelando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={() => !cancelando && onCerrar()}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: B.white }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${B.terra}18`, color: B.terra }}
            >
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-sm font-black" style={{ color: B.charcoal }}>
              Cancelar pedido
            </h3>
          </div>
          <button onClick={onCerrar} disabled={cancelando} style={{ color: B.muted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-2">
          <p className="text-sm" style={{ color: B.charcoal }}>
            ¿Seguro que deseas cancelar el pedido de{' '}
            <span className="font-bold">{nombreMesa}</span>?
          </p>
          <p className="text-xs mt-1.5" style={{ color: B.muted }}>
            Se eliminará el pedido activo (sin afectar el stock) y la mesa quedará
            disponible nuevamente. Esta acción no se puede deshacer.
          </p>
          {error && (
            <p className="text-xs mt-2 font-semibold" style={{ color: B.terra }}>
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={onCerrar}
            disabled={cancelando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: B.creamDark, color: B.charcoal }}
          >
            Volver
          </button>
          <button
            onClick={handleConfirmar}
            disabled={cancelando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.terra, color: '#fff', opacity: cancelando ? 0.7 : 1 }}
          >
            {cancelando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}