// components/ventamesa/SelectorMesa.tsx
'use client';

import { useMemo, useState } from 'react';
import { Loader2, UtensilsCrossed } from 'lucide-react';
import { B } from '@/lib/brand';
import { useGlobalData } from '@/context/GlobalDataContext';
import { MesaEstadoKPIs } from './MesaEstadoKPIs';
import { MesaCard } from './MesaCard';
import type { EstadoMesa } from '@/lib/supabase/types';
import type { MesaRow } from '@/utils/venta-mesa/ventaMesaUtils';

interface SelectorMesaProps {
  onSelect: (mesa: MesaRow) => void;
}

export function SelectorMesa({ onSelect }: SelectorMesaProps) {
  const { mesas, isLoading } = useGlobalData();
  const [filtro, setFiltro] = useState<EstadoMesa | 'todas'>('todas');

  const zonas = useMemo(
    () => [...new Set(mesas.map((m) => m.zona))].sort(),
    [mesas],
  );

  const filtradas = useMemo(
    () => (mesas as unknown as MesaRow[]).filter(
      (m) => filtro === 'todas' || m.estado === filtro,
    ),
    [mesas, filtro],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
      </div>
    );
  }

  return (
    <div>
      <MesaEstadoKPIs
        mesas={mesas as unknown as MesaRow[]}
        filtro={filtro}
        onFiltroChange={setFiltro}
      />

      {zonas.map((zona) => {
        const items = filtradas.filter((m) => m.zona === zona);
        if (items.length === 0) return null;
        return (
          <div key={zona} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full" style={{ background: B.gold }} />
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: B.charcoal }}>
                {zona}
              </h2>
              <span className="text-xs" style={{ color: B.muted }}>
                · {items.length} MESA{items.length !== 1 ? 'S' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {items.map((mesa) => (
                <MesaCard key={mesa.id} mesa={mesa} onSelect={onSelect} />
              ))}
            </div>
          </div>
        );
      })}

      {filtradas.length === 0 && (
        <div className="py-20 text-center" style={{ color: B.muted }}>
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay mesas con ese filtro</p>
        </div>
      )}
    </div>
  );
}