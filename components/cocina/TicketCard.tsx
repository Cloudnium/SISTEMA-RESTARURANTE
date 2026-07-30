// components/cocina/TicketCard.tsx
'use client';

import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { B } from '@/lib/brand';
import type { PedidoItem } from '@/lib/supabase/types';
import { fmtHora, minutosDesde, cfgUrgencia, type TicketCocina } from '@/utils/cocina/cocinaUtils';
import ItemRow from '@/components/cocina/ItemRow';

interface TicketCardProps {
  ticket:             TicketCocina;
  ahoraMs:            number;
  onToggleItem:       (item: PedidoItem) => void;
  onMarcarTodoListo:  (pedidoId: string) => void;
  itemsProcesando:    Set<string>;
}

// ─── Tarjeta ticket (una mesa/pedido) ─────────────────────────────────────────
export default function TicketCard({
  ticket, ahoraMs, onToggleItem, onMarcarTodoListo, itemsProcesando,
}: TicketCardProps) {
  const { pedido, pendientes, listos } = ticket;
  const mesa      = pedido.mesa;
  const minutos   = minutosDesde(ticket.inicio, ahoraMs);
  const urgencia  = cfgUrgencia(minutos);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: B.white, border: `1.5px solid ${urgencia.color}40` }}
    >
      {/* Header ticket */}
      <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ background: urgencia.bg }}>
        <div className="min-w-0">
          <p className="text-sm font-black truncate" style={{ color: B.charcoal }}>
            {mesa?.nombre ?? `Mesa ${mesa?.numero ?? '—'}`}
          </p>
          <p className="text-[11px]" style={{ color: B.muted }}>
            {mesa?.zona ?? ''} · {fmtHora(pedido.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full shrink-0" style={{ background: `${urgencia.color}20` }}>
          <Clock className="w-3.5 h-3.5" style={{ color: urgencia.color }} />
          <span className="text-xs font-black" style={{ color: urgencia.color }}>{minutos} min</span>
        </div>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2 flex-1">
        {pendientes.map(item => (
          <ItemRow key={item.id} item={item} onToggle={onToggleItem} procesando={itemsProcesando.has(item.id)} />
        ))}
        {listos.map(item => (
          <ItemRow key={item.id} item={item} onToggle={onToggleItem} procesando={itemsProcesando.has(item.id)} />
        ))}
      </div>

      {/* Footer */}
      {pendientes.length > 0 && (
        <div className="p-3 pt-0">
          <button
            onClick={() => onMarcarTodoListo(pedido.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: B.green, color: B.cream }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Marcar pedido listo ({pendientes.length})
          </button>
        </div>
      )}
      {pendientes.length === 0 && listos.length > 0 && (
        <div className="px-3 pb-3">
          <div
            className="flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 rounded-lg"
            style={{ color: B.green, background: '#e8f5e2' }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Listo, esperando que lo recojan
          </div>
        </div>
      )}
    </div>
  );
}