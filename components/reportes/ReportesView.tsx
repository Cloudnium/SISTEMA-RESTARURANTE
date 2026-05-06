// components/reportes/ReportesView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Download, DollarSign, Coffee, TrendingUp, BarChart3, ShoppingBasket, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn, ProgressBar } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';

type Periodo = 'semana' | 'mes';

export default function ReportesView() {
  const { ventasSemana, ventasHoy, productos, isLoading } = useGlobalData();
  const [periodo, setPeriodo] = useState<Periodo>('semana');

  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Agrupar ventas por día de semana
  const ventasPorDia = useMemo(() => {
    return dias.map((d, i) => {
      const dayNum = i === 6 ? 0 : i + 1;
      const total = ventasSemana
        .filter(v => new Date(v.fecha_local + 'T00:00:00').getDay() === dayNum)
        .reduce((a, v) => a + v.total, 0);
      return { d, v: total };
    });
  }, [ventasSemana]);

  // Top productos vendidos (desde venta_items de ventasHoy)
  const topProductos = useMemo(() => {
    const map = new Map<string, { nombre: string; qty: number; total: number }>();
    ventasHoy.forEach(v => {
      v.items?.forEach(item => {
        const prev = map.get(item.producto_id) ?? {
          nombre: item.producto?.nombre ?? item.producto_id, qty: 0, total: 0,
        };
        map.set(item.producto_id, {
          nombre: prev.nombre,
          qty:    prev.qty + item.cantidad,
          total:  prev.total + (item.subtotal ?? 0),
        });
      });
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [ventasHoy]);

  // Top insumos usados en cocina (desde stock vs mínimo como proxy)
  const insumosUsados = useMemo(() => {
    return productos
      .filter(p => p.tipo === 'insumo' && p.activo)
      .sort((a, b) => (b.stock_minimo_cocina * b.precio) - (a.stock_minimo_cocina * a.precio))
      .slice(0, 5)
      .map(p => ({ nombre: p.nombre, uso: p.stock_minimo_cocina, unidad: p.unidad_medida }));
  }, [productos]);

  const totalSemana  = ventasSemana.reduce((a, v) => a + v.total, 0);
  const totalHoy     = ventasHoy.reduce((a, v) => a + v.total, 0);
  const transacciones = ventasHoy.length;
  const ticketProm    = transacciones > 0 ? totalHoy / transacciones : 0;
  const maxDia        = Math.max(...ventasPorDia.map(d => d.v), 1);
  const mejorDia      = ventasPorDia.reduce((a, b) => b.v > a.v ? b : a, ventasPorDia[0]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Reportes y Análisis" subtitle="Estadísticas de ventas, postres e insumos"
        action={
          <div className="flex gap-2">
            <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${B.cream}` }}>
              {(['semana', 'mes'] as Periodo[]).map(k => (
                <button key={k} onClick={() => setPeriodo(k)}
                  className="px-4 py-2 text-sm font-medium capitalize"
                  style={periodo === k ? { background: B.charcoal, color: B.cream } : { background: B.white, color: B.charcoal }}>
                  {k === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
            <Btn color={B.green} textColor={B.cream}>
              <Download className="w-4 h-4" /> Exportar
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Ingresos Semana', value: `S/ ${totalSemana.toFixed(2)}`, icon: DollarSign, color: B.green },
          { label: 'Ventas Hoy',      value: `S/ ${totalHoy.toFixed(2)}`,    icon: TrendingUp, color: B.terra },
          { label: 'Ticket Promedio', value: `S/ ${ticketProm.toFixed(2)}`,  icon: Coffee,     color: B.gold },
          { label: 'Mejor Día',       value: mejorDia?.d ?? '-',             icon: BarChart3,  color: B.charcoal },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: B.white, border: `1px solid ${B.cream}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${k.color}18` }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: B.muted }}>{k.label}</p>
              <p className="text-lg font-bold" style={{ color: B.charcoal }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico semanal */}
      <Card className="mb-5">
        <p className="text-sm font-bold mb-1" style={{ color: B.charcoal }}>Ventas por Día de la Semana</p>
        <p className="text-xs mb-4" style={{ color: B.muted }}>Ingresos en soles · semana actual</p>
        <div className="flex items-end gap-2 h-36">
          {ventasPorDia.map(d => (
            <div key={d.d} className="flex-1 flex flex-col items-center gap-1">
              {d.v > 0 && (
                <span className="text-[9px]" style={{ color: B.muted }}>S/{Math.round(d.v)}</span>
              )}
              <div className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${Math.max((d.v / maxDia) * 100, d.v > 0 ? 4 : 0)}%`,
                  background: d.d === mejorDia?.d ? B.terra : B.green,
                  opacity: 0.85,
                  minHeight: d.v > 0 ? 8 : 0,
                }} />
              <span className="text-xs font-bold" style={{ color: B.charcoal }}>{d.d}</span>
            </div>
          ))}
        </div>
        {totalSemana === 0 && (
          <p className="text-center text-sm py-4" style={{ color: B.muted }}>
            Sin ventas registradas esta semana
          </p>
        )}
      </Card>

      {/* Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top platos */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${B.terra}18` }}>
              <Coffee className="w-3.5 h-3.5" style={{ color: B.terra }} />
            </div>
            <p className="text-sm font-bold" style={{ color: B.charcoal }}>Postres y Platos más Vendidos</p>
          </div>

          {topProductos.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: B.muted }}>Sin datos de ventas hoy</p>
          ) : (
            topProductos.map((p, i) => (
              <div key={p.nombre} className="flex items-center gap-3 py-2.5 border-b last:border-0"
                style={{ borderColor: B.cream }}>
                <span className="text-xs font-black w-5 text-right shrink-0" style={{ color: B.gold }}>#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ color: B.charcoal }}>{p.nombre}</span>
                    <span className="text-sm font-bold" style={{ color: B.green }}>S/ {p.total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressBar pct={(p.qty / (topProductos[0]?.qty || 1)) * 100} color={B.terra} height={5} />
                    <span className="text-xs shrink-0" style={{ color: B.muted }}>{p.qty} und.</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* Insumos más usados */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${B.gold}18` }}>
              <ShoppingBasket className="w-3.5 h-3.5" style={{ color: B.gold }} />
            </div>
            <p className="text-sm font-bold" style={{ color: B.charcoal }}>Insumos con Mayor Demanda</p>
          </div>

          {insumosUsados.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: B.muted }}>Sin insumos registrados</p>
          ) : (
            insumosUsados.map((ins, i) => (
              <div key={ins.nombre} className="flex items-center gap-3 py-2.5 border-b last:border-0"
                style={{ borderColor: B.cream }}>
                <span className="text-xs font-black w-5 text-right shrink-0" style={{ color: B.gold }}>#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ color: B.charcoal }}>{ins.nombre}</span>
                    <span className="text-sm font-bold" style={{ color: B.charcoal }}>{ins.uso} {ins.unidad}</span>
                  </div>
                  <ProgressBar pct={(ins.uso / (insumosUsados[0]?.uso || 1)) * 100} color={B.gold} height={5} />
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}