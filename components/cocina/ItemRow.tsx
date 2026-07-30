// components/cocina/ItemRow.tsx
'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { B } from '@/lib/brand';
import type { PedidoItem } from '@/lib/supabase/types';

interface ItemRowProps {
  item:        PedidoItem;
  onToggle:    (item: PedidoItem) => void;
  procesando:  boolean;
}

// ─── Fila de item dentro de un ticket ─────────────────────────────────────────
export default function ItemRow({ item, onToggle, procesando }: ItemRowProps) {
  const listo = item.estado === 'listo';

  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors"
      style={{ background: listo ? '#e8f5e2' : B.cream }}
    >
      <button
        onClick={() => onToggle(item)}
        disabled={procesando}
        className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
        style={{
          background: listo ? B.green : B.white,
          border: `1.5px solid ${listo ? B.green : B.creamDark}`,
        }}
        title={listo ? 'Devolver a pendiente' : 'Marcar como listo'}
      >
        {listo && <CheckCircle2 className="w-4 h-4" style={{ color: '#fff' }} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black shrink-0" style={{ color: listo ? B.green : B.charcoal }}>
            {item.cantidad}×
          </span>
          <p
            className="text-sm font-semibold leading-tight"
            style={{
              color: listo ? B.green : B.charcoal,
              textDecoration: listo ? 'line-through' : 'none',
              opacity: listo ? 0.75 : 1,
            }}
          >
            {item.producto?.nombre ?? 'Producto'}
          </p>
        </div>
        {item.notas && (
          <p
            className="text-xs mt-1 px-2 py-1 rounded-lg inline-block"
            style={{ background: `${B.terra}15`, color: B.terra }}
          >
            📝 {item.notas}
          </p>
        )}
      </div>
    </div>
  );
}