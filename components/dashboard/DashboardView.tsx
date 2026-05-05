// components/dashboard/DashboardView.tsx
'use client';

import React, { useMemo } from 'react';
import { RefreshCw, DollarSign, Coffee, Users, Package, Receipt, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, KpiCard, PageHeader, Btn, ProgressBar } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function WeekChart({ data }: { data: Array<{ total: number; fecha_local: string }> }) {
  const dias = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  // Agrupar por día de semana
  const porDia = dias.map((d, i) => {
    const dayNum = i === 6 ? 0 : i + 1; // lunes=1..domingo=0
    const total = data
      .filter(v => new Date(v.fecha_local + 'T00:00:00').getDay() === dayNum)
      .reduce((a, v) => a + v.total, 0);
    return { d, v: total };
  });
  const max = Math.max(...porDia.map(d => d.v), 1);

  return (
    <div className="flex items-end gap-2 h-32">
      {porDia.map(d => (
        <div key={d.d} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px]" style={{ color: B.muted }}>
            {d.v > 0 ? `S/${Math.round(d.v)}` : ''}
          </span>
          <div className="w-full rounded-t-lg" style={{
            height: `${Math.max((d.v / max) * 100, 4)}%`,
            background: d.d === 'Sáb' ? B.terra : B.green, opacity: 0.85,
          }} />
          <span className="text-[10px] font-semibold" style={{ color: B.muted }}>{d.d}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function DashboardView() {
  const {
    ventasHoy, ventasRecientes, ventasSemana,
    productos, isLoading, refetchVentas, refetchVentasRecientes, refetchMetricas,
  } = useGlobalData();

  const stats = useMemo(() => {
    const totalVentas = ventasHoy.reduce((a, v) => a + v.total, 0);
    const transacciones = ventasHoy.length;
    const ticketProm = transacciones > 0 ? totalVentas / transacciones : 0;
    const insumosAlerta = productos.filter(p =>
      p.tipo === 'insumo' && p.stock_cocina < p.stock_minimo_cocina
    ).length;
    return { totalVentas, transacciones, ticketProm, insumosAlerta };
  }, [ventasHoy, productos]);

  // Top productos más vendidos hoy (calculado desde ventasHoy)
  const topProductos = useMemo(() => {
    const map = new Map<string, { nombre: string; qty: number }>();
    ventasHoy.forEach(v => {
      v.items?.forEach(item => {
        const prev = map.get(item.producto_id) ?? { nombre: item.producto?.nombre ?? item.producto_id, qty: 0 };
        map.set(item.producto_id, { nombre: prev.nombre, qty: prev.qty + item.cantidad });
      });
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [ventasHoy]);

  const maxQty = topProductos[0]?.qty ?? 1;

  const handleRefresh = async () => {
    await Promise.all([refetchVentas(), refetchVentasRecientes(), refetchMetricas()]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: B.green }} />
          <p className="text-sm" style={{ color: B.muted }}>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Vista general del restaurante · ${new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday:'long', day:'numeric', month:'long' })}`}
        action={
          <Btn onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Btn>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Ventas Hoy"       value={`S/ ${stats.totalVentas.toFixed(2)}`} sub={`${stats.transacciones} transacciones`} icon={DollarSign} color={B.green} />
        <KpiCard label="Ticket Promedio"  value={`S/ ${stats.ticketProm.toFixed(2)}`}  icon={Coffee}     color={B.terra} />
        <KpiCard label="Transacciones"    value={stats.transacciones}                   icon={Users}      color={B.gold} />
        <KpiCard label="Insumos con Alerta" value={stats.insumosAlerta}  sub="Stock bajo en cocina" icon={Package} color={B.charcoal} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <p className="text-sm font-bold mb-1" style={{ color: B.charcoal }}>Ventas de la Semana</p>
          <p className="text-xs mb-4" style={{ color: B.muted }}>Lunes a Domingo · ingresos en S/</p>
          <WeekChart data={ventasSemana} />
        </Card>

        <Card>
          <p className="text-sm font-bold mb-4" style={{ color: B.charcoal }}>
            {topProductos.length > 0 ? 'Más Vendidos Hoy' : 'Sin ventas aún hoy'}
          </p>
          {topProductos.length > 0 ? (
            <div className="space-y-3">
              {topProductos.map((p, i) => (
                <div key={p.nombre}>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black" style={{ color: B.gold }}>#{i + 1}</span>
                      <span className="text-xs font-medium truncate max-w-130px" style={{ color: B.charcoal }}>{p.nombre}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: B.charcoal }}>{p.qty}</span>
                  </div>
                  <ProgressBar pct={(p.qty / maxQty) * 100} color={B.terra} height={5} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center py-6" style={{ color: B.muted }}>
              Las ventas de hoy aparecerán aquí
            </p>
          )}
        </Card>
      </div>

      {/* Ventas recientes */}
      <Card>
        <p className="text-sm font-bold mb-4" style={{ color: B.charcoal }}>Ventas Recientes</p>
        {ventasRecientes.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: B.muted }}>No hay ventas recientes</p>
        ) : (
          ventasRecientes.map(v => (
            <div key={v.id}
              className="flex items-center justify-between py-3 border-b last:border-0"
              style={{ borderColor: B.cream }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${B.charcoal}12` }}>
                  <Receipt className="w-4 h-4" style={{ color: B.charcoal }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: B.charcoal }}>
                    {(v as unknown as { comprobante_numero?: string }).comprobante_numero ?? `Venta ${v.id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs" style={{ color: B.muted }}>{formatFecha(v.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={v.tipo_comprobante === 'boleta'
                    ? { background: '#e8f5e2', color: B.green }
                    : { background: '#fdf8e6', color: B.gold }
                  }>
                  {v.tipo_comprobante === 'nota_venta' ? 'Nota de Venta' : v.tipo_comprobante === 'boleta' ? 'Boleta' : 'Factura'}
                </span>
                <p className="text-sm font-bold" style={{ color: B.charcoal }}>S/ {v.total.toFixed(2)}</p>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}