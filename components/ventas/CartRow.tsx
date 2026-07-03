// components/ventas/CartRow.tsx
'use client';

import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { B } from '@/lib/brand';
import type { CartItem } from '@/lib/supabase/types';

interface CartRowProps {
  item:     CartItem;
  onUpdate: (id: string, qty: number) => void;
}

export function CartRow({ item, onUpdate }: CartRowProps) {
  return (
    <div
      className="flex items-center gap-3 py-3 border-b last:border-0"
      style={{ borderColor: B.cream }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: B.charcoal }}>
          {item.nombre}
        </p>
        <p className="text-xs" style={{ color: B.muted }}>
          S/ {item.precio.toFixed(2)} c/u
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Disminuir */}
        <button
          onClick={() => onUpdate(item.id, item.cantidad - 1)}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: B.cream }}
          onMouseEnter={(e) => (e.currentTarget.style.background = B.creamDark)}
          onMouseLeave={(e) => (e.currentTarget.style.background = B.cream)}
        >
          <Minus className="w-3 h-3" style={{ color: B.charcoal }} />
        </button>

        <span className="w-7 text-center text-sm font-bold" style={{ color: B.charcoal }}>
          {item.cantidad}
        </span>

        {/* Aumentar */}
        <button
          onClick={() => onUpdate(item.id, Math.min(item.cantidad + 1, item.stock_tienda))}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: B.cream }}
          onMouseEnter={(e) => (e.currentTarget.style.background = B.creamDark)}
          onMouseLeave={(e) => (e.currentTarget.style.background = B.cream)}
        >
          <Plus className="w-3 h-3" style={{ color: B.charcoal }} />
        </button>

        {/* Eliminar */}
        <button
          onClick={() => onUpdate(item.id, 0)}
          className="w-6 h-6 rounded-lg flex items-center justify-center ml-1"
          style={{ background: '#fee2e2' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#fecaca')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fee2e2')}
        >
          <Trash2 className="w-3 h-3" style={{ color: B.terra }} />
        </button>
      </div>
    </div>
  );
}