// components/ventas/ProductoCard.tsx
'use client';

import React from 'react';
import { Package } from 'lucide-react';
import Image from 'next/image';
import { B } from '@/lib/brand';
import type { Producto } from '@/lib/supabase/types';

interface ProductoCardProps {
  producto: Producto;
  onAdd:    (p: Producto) => void;
}

export function ProductoCard({ producto, onAdd }: ProductoCardProps) {
  const sinStock = producto.stock_tienda === 0;

  return (
    <button
      onClick={() => !sinStock && onAdd(producto)}
      disabled={sinStock}
      className="rounded-2xl text-left transition-all duration-200 overflow-hidden"
      style={{
        background: B.white,
        border:     `1.5px solid ${B.cream}`,
        opacity:    sinStock ? 0.5 : 1,
        cursor:     sinStock ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!sinStock) {
          e.currentTarget.style.borderColor = B.green;
          e.currentTarget.style.boxShadow = `0 4px 16px ${B.green}25`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = B.cream;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Imagen / placeholder */}
      <div className="h-28 flex items-center justify-center relative" style={{ background: B.cream }}>
        {producto.imagen ? (
          <Image src={producto.imagen} alt={producto.nombre} fill className="object-cover" />
        ) : (
          <Package className="w-10 h-10" style={{ color: B.creamDark }} />
        )}
      </div>

      {/* Datos */}
      <div className="p-3">
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: `${B.green}18`, color: B.green }}
        >
          {producto.categoria}
        </span>
        <p
          className="text-sm font-semibold mt-1.5 leading-tight line-clamp-2"
          style={{ color: B.charcoal }}
        >
          {producto.nombre}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-base font-black" style={{ color: B.terra }}>
            S/ {producto.precio.toFixed(2)}
          </p>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-lg"
            style={{ background: B.cream, color: B.muted }}
          >
            {sinStock ? 'Sin stock' : `Stock: ${producto.stock_tienda}`}
          </span>
        </div>
      </div>
    </button>
  );
}