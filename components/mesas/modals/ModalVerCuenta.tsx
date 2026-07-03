// components/mesas/modals/ModalVerCuenta.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { startTransition } from 'react';
import { X, Loader2, FileText, RefreshCw, Package, Clock, ShoppingCart } from 'lucide-react';
import { B } from '@/lib/brand';
import { supabase } from '@/lib/supabase/client';
import { getPedidoActivoMesa } from '@/lib/supabase/queries';
import type { Pedido, PedidoItem } from '@/lib/supabase/types';
import { fmtSoles, type MesaRow } from '@/utils/mesas/mesasUtils';

interface Props {
  mesa: MesaRow;
  onClose: () => void;
}

export default function ModalVerCuenta({ mesa, onClose }: Props) {
  const [pedido,   setPedido]   = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    startTransition(async () => {
      try {
        const p = await getPedidoActivoMesa(mesa.id);
        setPedido(p);
      } finally {
        setCargando(false);
      }
    });
  }, [mesa.id]);

  useEffect(() => { cargar(); }, [cargar]);
  
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  
  useEffect(() => {
    const channel = supabase
      .channel(`cuenta-mesa-${mesa.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, cargar)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pedidos',
        filter: `mesa_id=eq.${mesa.id}`,
      }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mesa.id, cargar]);

  const items: PedidoItem[] = pedido?.items ?? [];
  const total = items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(20,20,30,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col"
        style={{ background: B.white, maxHeight: '88vh', maxWidth: 480 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${B.cream}` }}
        >
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: B.charcoal }}>
            <FileText className="w-5 h-5" style={{ color: '#7C3AED' }} />
            Ver Cuenta — {mesa.nombre ?? `Mesa ${mesa.numero}`}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={cargar}
              className="p-1.5 rounded-lg"
              style={{ color: B.muted }}
              onMouseEnter={e => e.currentTarget.style.background = B.cream}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg"
              style={{ color: B.muted }}
              onMouseEnter={e => e.currentTarget.style.background = B.cream}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {cargando && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: B.green }} />
            </div>
          )}

          {!cargando && !pedido && (
            <div
              className="flex flex-col items-center gap-3 py-10 rounded-2xl"
              style={{ background: B.cream }}
            >
              <Package className="w-10 h-10" style={{ color: B.muted }} />
              <p className="text-sm" style={{ color: B.muted }}>Sin pedido activo en esta mesa</p>
            </div>
          )}

          {!cargando && pedido && (
            <>
              {/* Info pedido */}
              <div
                className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: B.cream }}
              >
                <div>
                  <p className="text-xs" style={{ color: B.muted }}>Pedido iniciado</p>
                  <p className="text-sm font-semibold" style={{ color: B.charcoal }}>
                    {new Date(pedido.created_at).toLocaleTimeString('es-PE', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {mesa.minutos_ocupada != null && (
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: B.muted }}>
                    <Clock className="w-4 h-4" />{mesa.minutos_ocupada} min
                  </div>
                )}
              </div>

              {/* Detalle */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${B.creamDark}` }}
              >
                <div
                  className="px-4 py-3 flex items-center gap-2"
                  style={{ background: B.cream, borderBottom: `1px solid ${B.creamDark}` }}
                >
                  <ShoppingCart className="w-4 h-4" style={{ color: B.charcoal }} />
                  <span
                    className="text-xs font-black uppercase tracking-widest"
                    style={{ color: B.charcoal }}
                  >
                    Detalle de consumo
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: B.muted }}>Sin productos</p>
                ) : (
                  <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                        style={{ borderColor: B.creamDark }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: B.cream, color: B.charcoal }}
                          >
                            {item.cantidad}×
                          </span>
                          <span className="truncate" style={{ color: B.charcoal }}>
                            {item.producto?.nombre ?? 'Producto'}
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="font-bold" style={{ color: B.charcoal }}>
                            {fmtSoles(item.subtotal)}
                          </p>
                          <p className="text-[10px]" style={{ color: B.muted }}>
                            {fmtSoles(item.precio_unitario)} c/u
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total */}
                <div
                  className="flex items-center justify-between px-4 py-4"
                  style={{ background: B.cream, borderTop: `2px solid ${B.creamDark}` }}
                >
                  <span
                    className="font-black uppercase tracking-wide text-sm"
                    style={{ color: B.charcoal }}
                  >
                    Total
                  </span>
                  <span className="text-2xl font-black" style={{ color: '#7C3AED' }}>
                    {fmtSoles(total)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 shrink-0 flex justify-end"
          style={{ borderTop: `1px solid ${B.cream}` }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}