// components/compras/components/ComprasKpis.tsx
'use client';

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { B } from '@/lib/brand';
import { KpiCard } from '@/components/ui';
import type { Compra } from '@/lib/supabase/types';
import type { MetricasDashboard } from '@/lib/supabase/queries';

interface ComprasKpisProps {
  compras:  Compra[];
  metricas: MetricasDashboard | null;
}

export function ComprasKpis({ compras, metricas }: ComprasKpisProps) {
  const { totalMes, totalRegistrado, promedio } = useMemo(() => {
    // Mes y año actuales en hora peruana
    const ahora   = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // "2026-06-16"
    const prefijo = ahora.slice(0, 7); // "2026-06"

    const delMes  = compras.filter(c => c.fecha_emision.startsWith(prefijo));
    const totalM  = delMes.reduce((a, c) => a + c.total, 0);

    const totalAll = compras.reduce((a, c) => a + c.total, 0);
    const avg      = compras.length > 0 ? totalAll / compras.length : 0;

    return { totalMes: totalM, totalRegistrado: totalAll, promedio: avg };
  }, [compras]);

  const ventasHoy = metricas?.ventasHoy ?? 0;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
      <KpiCard
        label="Ventas de Hoy"
        value={`S/ ${ventasHoy.toFixed(2)}`}
        sub="Ingresos"
        icon={TrendingUp}
        color={B.green}
      />
      <KpiCard
        label="Ventas del Mes"
        value={`S/ ${ventasHoy.toFixed(2)}`}
        sub="Ingresos mes"
        icon={DollarSign}
        color={B.green}
      />
      <KpiCard
        label="Compras del Mes"
        value={`S/ ${totalMes.toFixed(2)}`}
        sub="Egresos"
        icon={TrendingDown}
        color={B.terra}
      />
      <KpiCard
        label="Diferencia Mes"
        value={`S/ ${(ventasHoy - totalMes).toFixed(2)}`}
        icon={DollarSign}
        color={B.gold}
      />
      <div
        className="rounded-2xl p-4"
        style={{ background: B.white, border: `1px solid ${B.cream}` }}
      >
        <p
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: B.muted }}
        >
          Total registrado
        </p>
        <p className="text-lg font-black mt-0.5" style={{ color: B.terra }}>
          S/ {totalRegistrado.toFixed(2)}
        </p>
        <p className="text-[10px] mt-1" style={{ color: B.muted }}>
          Promedio:{' '}
          <span style={{ color: B.charcoal, fontWeight: 700 }}>
            S/ {promedio.toFixed(2)}
          </span>
        </p>
      </div>
    </div>
  );
}