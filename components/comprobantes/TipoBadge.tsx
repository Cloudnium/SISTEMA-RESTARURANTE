// components/comprobantes/TipoBadge.tsx
'use client';

import React from 'react';
import { TIPO_CFG } from '@/constants/comprobantes/comprobantesConstants';
import type { TipoComprobante } from '@/lib/supabase/types';

export function TipoBadge({ tipo }: { tipo: TipoComprobante }) {
  const cfg = TIPO_CFG[tipo];
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ─── EstadoBadge ──────────────────────────────────────────────────────────────
export function EstadoBadge({ estado }: { estado: 'emitido' | 'anulado' }) {
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={
        estado === 'emitido'
          ? { background: '#e8f5e2', color: '#5C7A3E' }
          : { background: '#fee2e2', color: '#D4673A' }
      }
    >
      {estado}
    </span>
  );
}