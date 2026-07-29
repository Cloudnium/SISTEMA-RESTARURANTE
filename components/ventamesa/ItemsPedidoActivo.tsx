// components/venta-mesa/ItemsPedidoActivo.tsx
'use client';

import React, { useState } from 'react';
import { X, Loader2, ChefHat, CheckCircle2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { fmtSoles } from '@/utils/venta-mesa/ventaMesaUtils';
import type { PedidoItem } from '@/lib/supabase/types';

interface ItemsPedidoActivoProps {
  items:          PedidoItem[];
  onCancelarItem: (itemId: string) => Promise<void>;
}

export function ItemsPedidoActivo({ items, onCancelarItem }: ItemsPedidoActivoProps) {
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [confirmarId,  setConfirmarId]  = useState<string | null>(null);
  const [error,        setError]        = useState('');

  if (items.length === 0) return null;

  const handleCancelar = async (itemId: string) => {
    setCancelandoId(itemId);
    setError('');
    try {
      await onCancelarItem(itemId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar el ítem');
    } finally {
      setCancelandoId(null);
      setConfirmarId(null);
    }
  };

  return (
    <div
      className="rounded-2xl p-4 mb-5"
      style={{ background: B.white, border: `1px solid ${B.creamDark}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ChefHat className="w-4 h-4" style={{ color: B.green }} />
        <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: B.charcoal }}>
          Pedido enviado a cocina
        </h3>
        <span className="text-[10px]" style={{ color: B.muted }}>
          · {items.length} ítem{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <p className="text-xs mb-2 font-semibold" style={{ color: B.terra }}>{error}</p>
      )}

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const enConfirmacion = confirmarId === item.id;
          const cancelando     = cancelandoId === item.id;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition-opacity"
              style={{ background: B.cream, opacity: cancelando ? 0.6 : 1 }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold" style={{ color: B.charcoal }}>
                    {item.cantidad}×
                  </span>
                  <span className="text-sm truncate" style={{ color: B.charcoal }}>
                    {item.producto?.nombre ?? 'Producto'}
                  </span>
                  {item.estado === 'listo' && (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: B.green }} />
                  )}
                </div>
                {item.notas && (
                  <p className="text-[11px] truncate" style={{ color: B.muted }}>
                    {item.notas}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold" style={{ color: B.muted }}>
                  {fmtSoles(item.cantidad * item.precio_unitario)}
                </span>

                {!enConfirmacion ? (
                  <button
                    onClick={() => setConfirmarId(item.id)}
                    disabled={cancelando}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ background: `${B.terra}15`, color: B.terra }}
                    title="Cancelar este ítem"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setConfirmarId(null)}
                      disabled={cancelando}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold"
                      style={{ background: B.creamDark, color: B.charcoal }}
                    >
                      No
                    </button>
                    <button
                      onClick={() => handleCancelar(item.id)}
                      disabled={cancelando}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1"
                      style={{ background: B.terra, color: '#fff' }}
                    >
                      {cancelando
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : 'Sí, cancelar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}