// components/mesas/MesaCard.tsx
'use client';

import { Users, Clock } from 'lucide-react';
import { B } from '@/lib/brand';
import type { EstadoMesa } from '@/lib/supabase/types';
import { ESTADOS } from '@/constants/mesas/mesasConstants';
import { fmtSoles, type MesaRow } from '@/utils/mesas/mesasUtils';
import IlustracionMesa from './IlustracionMesa';

interface Props {
  mesa: MesaRow;
  onClick: (m: MesaRow) => void;
}

export default function MesaCard({ mesa, onClick }: Props) {
  const estado: EstadoMesa = mesa.estado ?? 'disponible';
  const est = ESTADOS[estado];
  const pedidoTotal = mesa.pedido_total != null ? fmtSoles(mesa.pedido_total) : null;
  const hora = mesa.pedido_inicio
    ? new Date(mesa.pedido_inicio).toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <button
      onClick={() => onClick(mesa)}
      className="rounded-2xl p-3 sm:p-4 text-left transition-all duration-200 relative overflow-hidden flex flex-col"
      style={{ background: est.bg, border: `1.5px solid ${est.color}30`, minHeight: 130 }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 4px 16px ${est.color}30`;
        e.currentTarget.style.borderColor = est.color;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = `${est.color}30`;
      }}
    >
      {/* Fila superior: nombre + badge */}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p
            className="text-xs sm:text-sm font-black tracking-widest uppercase truncate"
            style={{ color: est.color }}
          >
            {mesa.nombre ?? `Mesa ${mesa.numero}`}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Users className="w-3 h-3 shrink-0" style={{ color: B.muted }} />
            <span className="text-[10px]" style={{ color: B.muted }}>{mesa.capacidad} pers.</span>
          </div>
        </div>

        <span
          className="shrink-0 flex items-center gap-1 text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap"
          style={{
            background: `${est.color}18`,
            color: est.color,
            border: `1px solid ${est.color}30`,
          }}
        >
          <est.icon className="w-2.5 h-2.5 shrink-0" />
          {est.label}
        </span>
      </div>

      {/* Fila inferior: info de ocupación + ilustración */}
      <div className="flex items-end justify-between gap-2 mt-auto">
        <div className="min-w-0 flex-1">
          {estado === 'ocupada' && (
            <>
              {mesa.mozo   && <p className="text-xs font-semibold truncate" style={{ color: B.charcoal }}>{mesa.mozo}</p>}
              {pedidoTotal && <p className="text-xs font-bold" style={{ color: est.color }}>{pedidoTotal}</p>}
              {hora && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" style={{ color: B.muted }} />
                  <span className="text-[10px]" style={{ color: B.muted }}>{hora}</span>
                </div>
              )}
            </>
          )}

          {estado !== 'ocupada' && (
            <p className="text-[10px] truncate" style={{ color: B.muted }}>
              {estado === 'disponible' ? 'Lista para atender'
                : estado === 'limpieza'  ? 'En limpieza'
                : estado === 'reservada' ? 'Reservada' : ''}
            </p>
          )}
        </div>

        <div
          className="shrink-0 pointer-events-none w-12.5 sm:w-16.25"
          style={{ opacity: 0.55 }}
          aria-hidden="true"
        >
          <IlustracionMesa estado={estado} />
        </div>
      </div>
    </button>
  );
}