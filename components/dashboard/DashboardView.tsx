// components/dashboard/DashboardView.tsx
'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';

import { DashboardKpis }            from './DashboardKpis';
import { DashboardCharts }          from './DashboardCharts';
import { DashboardVentasRecientes } from './DashboardVentasRecientes';

const LIMITE_VENTAS_RECIENTES = 5;

function fechaHoyLima(): string {
  return new Date().toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    weekday:  'long',
    day:      'numeric',
    month:    'long',
  });
}

export default function DashboardView() {
  const {
    ventasHoy,
    ventasRecientes,
    ventasSemana,
    productos,
    topProductosHoy,
    metricas,
    isLoading,
    refetchVentas,
    refetchVentasRecientes,
    refetchMetricas,
    refetchTopProductos,
  } = useGlobalData();

  const [refreshing, setRefreshing] = useState(false);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (metricas) {
      return {
        totalVentas:       metricas.ventasHoy,
        transacciones:     metricas.transacciones,
        ticketPromedio:    metricas.ticketPromedio,
        productosVendidos: metricas.productosVendidos,
        insumosAlerta:     metricas.insumosConAlerta,
      };
    }
    const totalVentas   = ventasHoy.reduce((a, v) => a + v.total, 0);
    const transacciones = ventasHoy.length;
    return {
      totalVentas,
      transacciones,
      ticketPromedio:    transacciones > 0 ? totalVentas / transacciones : 0,
      productosVendidos: 0,
      insumosAlerta:     productos.filter(
        p => p.tipo === 'insumo' && p.stock_cocina < p.stock_minimo_cocina
      ).length,
    };
  }, [metricas, ventasHoy, productos]);

  // ── Últimas 5 ventas ────────────────────────────────────────────────────────
  const ventasRecientesLimitadas = useMemo(
    () => ventasRecientes.slice(0, LIMITE_VENTAS_RECIENTES),
    [ventasRecientes],
  );

  // ── Refresco manual ──────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        refetchVentas(),
        refetchVentasRecientes(),
        refetchMetricas(),
        refetchTopProductos(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2
            className="w-10 h-10 animate-spin mx-auto mb-3"
            style={{ color: B.green }}
          />
          <p className="text-sm" style={{ color: B.muted }}>Cargando dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Vista general del restaurante · ${fechaHoyLima()}`}
        action={
          <Btn onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw
              className={`w-4 h-4 transition-transform ${refreshing ? 'animate-spin' : ''}`}
            />
          </Btn>
        }
      />

      <DashboardKpis
        totalVentas={stats.totalVentas}
        transacciones={stats.transacciones}
        ticketPromedio={stats.ticketPromedio}
        productosVendidos={stats.productosVendidos}
        insumosAlerta={stats.insumosAlerta}
      />

      <DashboardCharts
        ventasSemana={ventasSemana}
        topProductosHoy={topProductosHoy ?? []}
      />

      <DashboardVentasRecientes ventas={ventasRecientesLimitadas} />
    </div>
  );
}