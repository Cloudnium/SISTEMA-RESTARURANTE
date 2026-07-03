// components/venta-mesa/MesaCard.tsx
'use client';

import { ChevronRight, Users, Clock } from 'lucide-react';
import { B } from '@/lib/brand';
import { ESTADO_CFG } from '@/constants/venta-mesa/ventaMesaConstants';
import { fmtSoles, fmtHora, type MesaRow } from '@/utils/venta-mesa/ventaMesaUtils';
import IlustracionMesa from '@/components/mesas/IlustracionMesa'; // ← importar

interface MesaCardProps {
  mesa: MesaRow;
  onSelect: (mesa: MesaRow) => void;
}

export function MesaCard({ mesa, onSelect }: MesaCardProps) {
  const cfg = ESTADO_CFG[mesa.estado ?? 'disponible'];
  const bloqueada = mesa.estado === 'limpieza' || mesa.estado === 'reservada';

  return (
    <button
      onClick={() => !bloqueada && onSelect(mesa)}
      disabled={bloqueada}
      className="rounded-2xl p-3 sm:p-4 text-left transition-all duration-200 relative overflow-hidden flex flex-col"
      style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.color}30`,
        minHeight: 120,
        opacity: bloqueada ? 0.5 : 1,
        cursor: bloqueada ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!bloqueada) {
          e.currentTarget.style.boxShadow = `0 4px 20px ${cfg.color}35`;
          e.currentTarget.style.borderColor = cfg.color;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = `${cfg.color}30`;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Fila superior: nombre a la izquierda, badge + chevron a la derecha */}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p
            className="text-xs sm:text-sm font-black tracking-widest uppercase truncate"
            style={{ color: cfg.color }}
          >
            {mesa.nombre ?? `Mesa ${mesa.numero}`}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Users className="w-3 h-3 shrink-0" style={{ color: B.muted }} />
            <span className="text-[10px]" style={{ color: B.muted }}>{mesa.capacidad} pers.</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className="text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap"
            style={{
              background: `${cfg.color}18`,
              color: cfg.color,
              border: `1px solid ${cfg.color}30`,
            }}
          >
            {cfg.label}
          </span>
          {!bloqueada && (
            <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
          )}
        </div>
      </div>

      {/* Fila inferior: info de ocupación + ilustración */}
      <div className="flex items-end justify-between gap-2 mt-auto">
        <div className="min-w-0 flex-1">
          {mesa.estado === 'ocupada' ? (
            <>
              {mesa.pedido_total != null && (
                <p className="text-xs font-bold" style={{ color: cfg.color }}>
                  {fmtSoles(mesa.pedido_total)}
                </p>
              )}
              {mesa.pedido_inicio && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" style={{ color: B.muted }} />
                  <span className="text-[10px]" style={{ color: B.muted }}>
                    {fmtHora(mesa.pedido_inicio)}
                    {mesa.minutos_ocupada != null && ` · ${mesa.minutos_ocupada}min`}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-[10px] truncate" style={{ color: B.muted }}>
              {mesa.estado === 'disponible' ? 'Lista para atender'
                : mesa.estado === 'limpieza'  ? 'En limpieza'
                : mesa.estado === 'reservada' ? 'Reservada' : ''}
            </p>
          )}
        </div>

        <div
          className="shrink-0 pointer-events-none w-12.5 sm:w-16.25"
          style={{ opacity: 0.55 }}
          aria-hidden="true"
        >
          <IlustracionMesa estado={mesa.estado ?? 'disponible'} />
        </div>
      </div>
    </button>
  );
}