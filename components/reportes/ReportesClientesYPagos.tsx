// components/reportes/ReportesClientesYPagos.tsx
'use client';

import React from 'react';
import { Users, CreditCard, BarChart3, Calendar } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';
import { fmtSoles, fmtFecha, iniciales, avatarColor } from '@/utils/reportes/reportesUtils';
import {
  COLORES_METODO, COLORES_COMPROBANTE, LABEL_METODO, LABEL_COMPROBANTE,
} from '@/constants/reportes/reportesConstants';
import type {
  ReporteTopClientes, ReporteVentasPorMetodoPago,
  ReporteVentasPorComprobante, ReporteResumenPeriodo,
} from '@/lib/supabase/queries/reportes';

// ─── Mejores Clientes ─────────────────────────────────────────────────────────
export function ReportesMejoresClientes({ clientes }: { clientes: ReporteTopClientes[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: B.green }} />
          <p className="text-sm font-bold" style={{ color: B.charcoal }}>Mejores Clientes</p>
        </div>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${B.gold}18` }}>
          <span className="text-[10px]" style={{ color: B.gold }}>★</span>
        </div>
      </div>

      {clientes.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: B.muted }}>Sin clientes en el período</p>
      ) : (
        <div className="space-y-3">
          {clientes.map((c, i) => (
            <div key={c.cliente_id} className="flex items-center gap-3 py-2 border-b last:border-0"
              style={{ borderColor: B.cream }}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
                style={{ background: avatarColor(i), color: B.white }}
              >
                {iniciales(c.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate" style={{ color: B.charcoal }}>
                    {c.nombre}
                  </p>
                  <p className="text-sm font-black shrink-0 ml-2" style={{ color: B.charcoal }}>
                    {fmtSoles(c.total)}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Calendar className="w-3 h-3" style={{ color: B.muted }} />
                  <span className="text-[10px]" style={{ color: B.muted }}>
                    {c.compras} compras
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${B.green}15`, color: B.green }}
                  >
                    Alta
                  </span>
                  <span className="text-[10px]" style={{ color: B.muted }}>
                    {fmtFecha(c.ultima_visita)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Métodos de Pago ──────────────────────────────────────────────────────────
export function ReportesMetodosPago({ metodos }: { metodos: ReporteVentasPorMetodoPago[] }) {
  const maxTotal = metodos[0]?.total ?? 1;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" style={{ color: B.green }} />
          <p className="text-sm font-bold" style={{ color: B.charcoal }}>Métodos de Pago</p>
        </div>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${B.green}18` }}>
          <CreditCard className="w-3.5 h-3.5" style={{ color: B.green }} />
        </div>
      </div>

      {metodos.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: B.muted }}>Sin pagos en el período</p>
      ) : (
        <div className="space-y-3">
          {metodos.map(m => {
            const color = COLORES_METODO[m.metodo_pago] ?? B.charcoal;
            const label = LABEL_METODO[m.metodo_pago] ?? m.metodo_pago;
            return (
              <div key={m.metodo_pago}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5" style={{ color }} />
                    <span className="text-sm font-semibold" style={{ color: B.charcoal }}>{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black" style={{ color: B.charcoal }}>
                      {fmtSoles(m.total)}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${color}15`, color }}
                    >
                      {m.cantidad}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: B.cream }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(m.total / maxTotal) * 100}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Ventas por Comprobante ───────────────────────────────────────────────────
export function ReportesVentasPorComprobante({
  comprobantes,
}: {
  comprobantes: ReporteVentasPorComprobante[];
}) {
  const totalGeneral = comprobantes.reduce((s, c) => s + c.total, 0) || 1;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" style={{ color: B.charcoalLight }} />
          <p className="text-sm font-bold" style={{ color: B.charcoal }}>Ventas por Comprobante</p>
        </div>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${B.charcoalLight}18` }}>
          <BarChart3 className="w-3.5 h-3.5" style={{ color: B.charcoalLight }} />
        </div>
      </div>

      {comprobantes.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: B.muted }}>Sin datos en el período</p>
      ) : (
        <div className="space-y-3">
          {comprobantes.map(c => {
            const color = COLORES_COMPROBANTE[c.tipo] ?? B.charcoal;
            const label = LABEL_COMPROBANTE[c.tipo] ?? c.tipo;
            const pct   = (c.total / totalGeneral) * 100;
            return (
              <div
                key={c.tipo}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: `${color}10` }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}20` }}
                >
                  <BarChart3 className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{label}</p>
                    <p className="text-sm font-black" style={{ color }}>
                      {fmtSoles(c.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full overflow-hidden"
                      style={{ background: `${color}20` }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[10px] shrink-0" style={{ color: B.muted }}>
                      {c.cantidad} documentos
                    </span>
                    <span className="text-[10px] font-bold shrink-0" style={{ color }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Resumen del Período ──────────────────────────────────────────────────────
export function ReportesResumenPeriodo({ resumen }: { resumen: ReporteResumenPeriodo | null }) {
  const r = resumen;
  const rows = [
    { label: 'Total Ventas',         value: fmtSoles(r?.totalVentas ?? 0),           icon: '$ ' },
    { label: 'Total Transacciones',  value: String(r?.totalTransacciones ?? 0),       icon: '🛒 ' },
    { label: 'Clientes Atendidos',   value: String(r?.clientesAtendidos ?? 0),        icon: '👤 ' },
  ];

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4" style={{ color: B.green }} />
        <p className="text-sm font-bold" style={{ color: B.charcoal }}>Resumen del Período</p>
      </div>
      <div className="space-y-2 mb-3">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between py-1.5"
            style={{ borderBottom: `1px solid ${B.cream}` }}>
            <span className="text-sm" style={{ color: B.muted }}>{row.label}</span>
            <span className="text-sm font-bold" style={{ color: B.charcoal }}>{row.value}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[
          { label: 'Promedio por Venta',   value: fmtSoles(r?.ticketPromedio ?? 0),     color: B.green },
          { label: 'Promedio por Cliente', value: fmtSoles(r?.promedioPorCliente ?? 0), color: '#3B82F6' },
        ].map(row => (
          <div key={row.label}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ background: row.color, color: B.white }}>
            <span className="text-sm font-semibold">$ {row.label}</span>
            <span className="text-sm font-black">{row.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}