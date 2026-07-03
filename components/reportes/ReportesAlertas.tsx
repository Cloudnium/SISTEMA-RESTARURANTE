// components/reportes/ReportesAlertas.tsx
'use client';

import React from 'react';
import { Package, TrendingDown } from 'lucide-react';
import { B } from '@/lib/brand';
import { ReporteResumenPeriodo } from '@/lib/supabase/queries/reportes';

interface ReportesAlertasProps {
  resumen: ReporteResumenPeriodo | null;
}

export function ReportesAlertas({ resumen }: ReportesAlertasProps) {
  const agotados = resumen?.productosAgotados ?? 0;
  const stockBajo = resumen?.stockBajo ?? 0;

  if (agotados === 0 && stockBajo === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
      {agotados > 0 && (
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: B.white, border: `2px solid ${B.terra}40` }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${B.terra}18` }}
          >
            <Package className="w-6 h-6" style={{ color: B.terra }} />
          </div>
          <div className="flex-1">
            <p className="text-lg font-black" style={{ color: B.charcoal }}>
              {agotados} Productos Agotados
            </p>
            <p className="text-xs" style={{ color: B.muted }}>Requieren reposición urgente</p>
          </div>
          <span
            className="text-xs font-black px-3 py-1 rounded-full shrink-0"
            style={{ background: B.terra, color: B.white }}
          >
            URGENTE
          </span>
        </div>
      )}
      {stockBajo > 0 && (
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: B.white, border: `2px solid ${B.gold}40` }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${B.gold}18` }}
          >
            <TrendingDown className="w-6 h-6" style={{ color: B.gold }} />
          </div>
          <div className="flex-1">
            <p className="text-lg font-black" style={{ color: B.charcoal }}>
              {stockBajo} Stock Bajo
            </p>
            <p className="text-xs" style={{ color: B.muted }}>Menos de mínimo disponible</p>
          </div>
          <span
            className="text-xs font-black px-3 py-1 rounded-full shrink-0"
            style={{ background: B.gold, color: B.white }}
          >
            ATENCIÓN
          </span>
        </div>
      )}
    </div>
  );
}