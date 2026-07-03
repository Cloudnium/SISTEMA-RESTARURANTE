// components/ventamesa/MesaEstadoKPIs.tsx
'use client';

import React from 'react';
import type { EstadoMesa } from '@/lib/supabase/types';
import { ESTADO_CFG } from '@/constants/venta-mesa/ventaMesaConstants';
import type { MesaRow } from '@/utils/venta-mesa/ventaMesaUtils';

interface MesaEstadoKPIsProps {
  mesas: MesaRow[];
  filtro: EstadoMesa | 'todas';
  onFiltroChange: (f: EstadoMesa | 'todas') => void;
}

export function MesaEstadoKPIs({ mesas, filtro, onFiltroChange }: MesaEstadoKPIsProps) {
  const counts = React.useMemo(
    () =>
      (['disponible', 'ocupada', 'limpieza', 'reservada'] as EstadoMesa[]).reduce(
        (acc, k) => ({ ...acc, [k]: mesas.filter((m) => m.estado === k).length }),
        {} as Record<EstadoMesa, number>,
      ),
    [mesas],
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {(Object.entries(ESTADO_CFG) as [EstadoMesa, (typeof ESTADO_CFG)[EstadoMesa]][]).map(
        ([k, v]) => (
          <button
            key={k}
            onClick={() => onFiltroChange(filtro === k ? 'todas' : k)}
            className="rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition-all"
            style={{
              background: filtro === k ? v.color : v.bg,
              border: `1.5px solid ${filtro === k ? v.color : `${v.color}25`}`,
            }}
          >
            <v.icon
              className="w-5 h-5 shrink-0"
              style={{ color: filtro === k ? '#fff' : v.color }}
            />
            <div>
              <p className="text-xs font-semibold" style={{ color: filtro === k ? '#fff' : v.color }}>
                {v.label}
              </p>
              <p className="text-2xl font-semibold" style={{ color: filtro === k ? '#fff' : '#2C3E35' }}>
                {counts[k]}
              </p>
            </div>
          </button>
        ),
      )}
    </div>
  );
}