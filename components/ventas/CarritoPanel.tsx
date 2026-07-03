// components/ventas/CarritoPanel.tsx
'use client';

import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';
import { CartRow } from './CartRow';
import type { CartItem } from '@/lib/supabase/types';

interface CarritoPanelProps {
  carrito:      CartItem[];
  base:         number;   // precio sin IGV (total / 1.18)
  igv:          number;   // IGV contenido en el precio
  total:        number;   // lo que paga el cliente (precio × qty, ya con IGV)
  onActualizar: (id: string, qty: number) => void;
  onLimpiar:    () => void;
  onProcesar:   () => void;
  cajaAbierta:  boolean;
}

export function CarritoPanel({
  carrito, base, igv, total, onActualizar, onLimpiar, onProcesar, cajaAbierta,
}: CarritoPanelProps) {
  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: B.charcoal }}>
          <ShoppingCart className="w-5 h-5" style={{ color: B.terra }} />
          Carrito de Venta
        </h2>
        {carrito.length > 0 && (
          <button
            onClick={onLimpiar}
            className="text-xs font-semibold px-2 py-1 rounded-lg"
            style={{ background: '#fee2e2', color: B.terra }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Vacío */}
      {carrito.length === 0 ? (
        <div className="flex flex-col items-center py-10" style={{ color: B.muted }}>
          <ShoppingCart className="w-12 h-12 mb-2 opacity-30" />
          <p className="text-sm">Carrito vacío</p>
        </div>
      ) : (
        <>
          {/* Items */}
          <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {carrito.map((item) => (
              <CartRow key={item.id} item={item} onUpdate={onActualizar} />
            ))}
          </div>

          {/* Totales */}
          <div className="mt-4 pt-4 border-t space-y-1.5" style={{ borderColor: B.cream }}>
            <div className="flex justify-between text-sm" style={{ color: B.muted }}>
              <span>Base imponible</span>
              <span>S/ {base.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: B.muted }}>
              <span>IGV (18% incl.)</span>
              <span>S/ {igv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-black pt-1" style={{ color: B.charcoal }}>
              <span>Total</span>
              <span style={{ color: B.terra }}>S/ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Botón procesar */}
          <button
            onClick={cajaAbierta ? onProcesar : undefined}
            disabled={!cajaAbierta}
            title={!cajaAbierta ? 'Debes abrir tu caja antes de vender' : undefined}
            className="w-full mt-4 py-3 rounded-xl text-sm font-black transition-all"
            style={{
              background: cajaAbierta ? B.green : B.muted,
              color:      B.cream,
              cursor:     cajaAbierta ? 'pointer' : 'not-allowed',
            }}
          >
            {cajaAbierta
              ? `Procesar Venta · S/ ${total.toFixed(2)}`
              : '🔒 Abre tu caja para vender'
            }
          </button>
        </>
      )}
    </Card>
  );
}