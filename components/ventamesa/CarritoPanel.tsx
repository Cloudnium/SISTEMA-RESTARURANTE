// components/venta-mesa/CarritoPanel.tsx
'use client';

import React from 'react';
import {
  ClipboardList, ShoppingCart, Trash2, Minus, Plus,
  Sparkles, AlertTriangle, Loader2, CheckCircle,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { catColor, fmtSoles, type ItemCarrito } from '@/utils/venta-mesa/ventaMesaUtils';

interface CarritoPanelProps {
  carrito:           ItemCarrito[];
  notas:             Record<string, string>;
  setNotas:          React.Dispatch<React.SetStateAction<Record<string, string>>>;
  subtotal:          number;
  totalItems:        number;
  onCambiarCantidad: (id: string, delta: number) => void;
  onQuitar:          (id: string) => void;
  onConfirmar:       () => void;
  confirmando:       boolean;
  error:             string;
  pedidoExistente:   boolean;
  cajaAbierta: boolean;
}

export function CarritoPanel({
  carrito, notas, setNotas, subtotal, totalItems,
  onCambiarCantidad, onQuitar, onConfirmar, confirmando, error, pedidoExistente, cajaAbierta
}: CarritoPanelProps) {
  return (
    <>
      {/* Header */}
      <div
        className="px-4 py-3 shrink-0 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${B.creamDark}`, background: B.cream }}
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4" style={{ color: B.charcoal }} />
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: B.charcoal }}>
            Pedido
          </span>
        </div>
        {totalItems > 0 && (
          <span
            className="text-xs font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: B.green, color: '#fff' }}
          >
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {carrito.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12" style={{ color: B.muted }}>
            <ShoppingCart className="w-10 h-10 opacity-25" />
            <p className="text-xs text-center px-4">
              Agrega productos del catálogo para armar el pedido
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
            {carrito.map((item) => {
              const color = catColor(item.producto.categoria);
              return (
                <div
                  key={item.producto.id}
                  className="px-4 py-3"
                  style={{ borderColor: B.creamDark }}
                >
                  {/* Fila nombre + quitar */}
                  <div className="flex items-start gap-2 mb-2">
                    <div
                      className="w-1 rounded-full mt-1 shrink-0"
                      style={{ height: 28, background: color }}
                    />
                    <p
                      className="text-sm font-semibold flex-1 leading-tight"
                      style={{ color: B.charcoal }}
                    >
                      {item.producto.nombre}
                    </p>
                    <button
                      onClick={() => onQuitar(item.producto.id)}
                      className="p-1 rounded-lg shrink-0"
                      style={{ color: B.muted }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fee2e2';
                        e.currentTarget.style.color = B.terra;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = B.muted;
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Cantidad + subtotal */}
                  <div className="flex items-center justify-between mb-2 pl-3">
                    <div
                      className="flex items-center rounded-xl overflow-hidden"
                      style={{ border: `1.5px solid ${color}` }}
                    >
                      <button
                        onClick={() => onCambiarCantidad(item.producto.id, -1)}
                        className="px-2.5 py-1.5 text-sm transition-colors"
                        style={{ color }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = `${color}15`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 text-sm font-black" style={{ color: B.charcoal }}>
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => onCambiarCantidad(item.producto.id, 1)}
                        className="px-2.5 py-1.5 text-sm transition-colors"
                        style={{ color }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = `${color}15`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold" style={{ color: B.charcoal }}>
                      {fmtSoles(item.cantidad * item.producto.precio)}
                    </span>
                  </div>

                  {/* Nota por item */}
                  <input
                    type="text"
                    value={notas[item.producto.id] ?? ''}
                    onChange={(e) =>
                      setNotas((n) => ({ ...n, [item.producto.id]: e.target.value }))
                    }
                    placeholder="Nota para cocina (opcional)..."
                    className="w-full pl-3 pr-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{
                      background: B.cream,
                      border: `1px solid ${B.creamDark}`,
                      color: B.charcoal,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: total + confirmar */}
      <div
        className="shrink-0 px-4 py-4 space-y-3"
        style={{ borderTop: `2px solid ${B.creamDark}` }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-black uppercase tracking-wide"
            style={{ color: B.muted }}
          >
            Subtotal estimado
          </span>
          <span className="text-xl font-black" style={{ color: B.charcoal }}>
            {fmtSoles(subtotal)}
          </span>
        </div>

        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
          style={{ background: `${B.green}12`, color: B.green }}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            {pedidoExistente
              ? 'Los productos se agregarán al pedido existente de esta mesa.'
              : 'El pago se realizará después desde el módulo Mesas.'}
          </span>
        </div>

        {error && (
          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ background: '#fef0e6', color: B.terra }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          onClick={cajaAbierta ? onConfirmar : undefined}
          disabled={confirmando || carrito.length === 0 || !cajaAbierta}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
          style={{
            background: cajaAbierta ? B.green : B.muted,
            color: B.cream,
            cursor: (!cajaAbierta || carrito.length === 0) ? 'not-allowed' : 'pointer',
          }}
        >
          {confirmando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : !cajaAbierta ? (
            '🔒 Abre tu caja para confirmar'
          ) : (
            <><CheckCircle className="w-4 h-4" />
            {pedidoExistente ? 'Agregar al pedido' : 'Confirmar pedido'}</>
          )}
        </button>
      </div>
    </>
  );
}