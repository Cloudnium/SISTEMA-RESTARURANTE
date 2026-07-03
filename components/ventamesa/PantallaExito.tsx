// components/venta-mesa/PantallaExito.tsx
'use client';

import React from 'react';
import { CheckCircle, Plus } from 'lucide-react';
import { B } from '@/lib/brand';
import type { MesaRow } from '@/utils/venta-mesa/ventaMesaUtils';

interface PantallaExitoProps {
  mesa:          MesaRow;
  onNuevoPedido: () => void;
  onVolver:      () => void;
}

export function PantallaExito({ mesa, onNuevoPedido, onVolver }: PantallaExitoProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] gap-6 text-center px-4">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: `${B.green}18` }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: B.green }} />
      </div>

      <div>
        <h2 className="text-2xl font-black mb-2" style={{ color: B.charcoal }}>
          ¡Pedido confirmado!
        </h2>
        <p className="text-sm" style={{ color: B.muted }}>
          Los productos fueron enviados a{' '}
          <span className="font-bold" style={{ color: B.charcoal }}>
            {mesa.nombre ?? `Mesa ${mesa.numero}`}
          </span>
          . El pago se realizará desde el módulo Mesas.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onVolver}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}
        >
          Volver a mesas
        </button>
        <button
          onClick={onNuevoPedido}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: B.green, color: B.cream }}
        >
          <Plus className="w-4 h-4" />
          Otro pedido
        </button>
      </div>
    </div>
  );
}