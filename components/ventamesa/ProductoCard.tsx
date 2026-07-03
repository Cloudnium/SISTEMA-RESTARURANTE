// components/venta-mesa/ProductoCard.tsx
'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { B } from '@/lib/brand';
import { catColor, fmtSoles } from '@/utils/venta-mesa/ventaMesaUtils';
import type { Producto } from '@/lib/supabase/types';

interface ProductoCardProps {
  producto: Producto;
  cantidad: number;
  onAgregar: (producto: Producto) => void;
  onCambiarCantidad: (productoId: string, delta: number) => void;
}

export function ProductoCard({
  producto,
  cantidad,
  onAgregar,
  onCambiarCantidad,
}: ProductoCardProps) {
  const color = catColor(producto.categoria);
  const sinStock = producto.stock_tienda === 0;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-150"
      style={{
        background: B.white,
        border: `1.5px solid ${cantidad > 0 ? color : B.creamDark}`,
        boxShadow: cantidad > 0 ? `0 2px 12px ${color}25` : 'none',
        opacity: sinStock ? 0.55 : 1,
      }}
    >
      {/* Cabecera con color de categoría */}
      <div
        className="px-3 pt-3 pb-2 flex items-start justify-between gap-2"
        style={{ background: `${color}10` }}
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-[9px] font-black uppercase tracking-wider mb-0.5"
            style={{ color }}
          >
            {producto.categoria}
          </p>
          <p className="text-sm font-bold leading-tight" style={{ color: B.charcoal }}>
            {producto.nombre}
          </p>
        </div>
        {cantidad > 0 && (
          <span
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{ background: color, color: '#fff' }}
          >
            {cantidad}
          </span>
        )}
      </div>

      {/* Precio y stock */}
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-black" style={{ color: B.charcoal }}>
          {fmtSoles(producto.precio)}
        </span>
        <span className="text-[10px]" style={{ color: sinStock ? B.terra : B.muted }}>
          {sinStock ? 'Sin stock' : `Stock: ${producto.stock_tienda}`}
        </span>
      </div>

      {/* Control de cantidad */}
      <div className="px-3 pb-3 mt-auto">
        {cantidad === 0 ? (
          <button
            onClick={() => !sinStock && onAgregar(producto)}
            disabled={sinStock}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: sinStock ? B.cream : color,
              color: sinStock ? B.muted : '#fff',
              cursor: sinStock ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        ) : (
          <div
            className="flex items-center justify-between rounded-xl overflow-hidden"
            style={{ border: `1.5px solid ${color}` }}
          >
            <button
              onClick={() => onCambiarCantidad(producto.id, -1)}
              className="flex-1 flex items-center justify-center py-2 transition-colors"
              style={{ color }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `${color}15`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-black px-3" style={{ color: B.charcoal }}>
              {cantidad}
            </span>
            <button
              onClick={() => onAgregar(producto)}
              className="flex-1 flex items-center justify-center py-2 transition-colors"
              style={{ color }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `${color}15`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}