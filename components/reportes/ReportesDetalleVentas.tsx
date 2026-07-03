// components/reportes/ReportesDetalleVentas.tsx
'use client';

import React from 'react';
import { Calendar, Package } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';
import { fmtFecha, fmtSoles } from '@/utils/reportes/reportesUtils';
import {
  COLORES_COMPROBANTE, COLORES_METODO,
  LABEL_COMPROBANTE, LABEL_METODO,
} from '@/constants/reportes/reportesConstants';
import type { DetalleVenta } from '@/lib/supabase/queries/reportes';

interface ReportesDetalleVentasProps {
  ventas: DetalleVenta[];
  limite: number;
}

export function ReportesDetalleVentas({ ventas, limite }: ReportesDetalleVentasProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold" style={{ color: B.charcoal }}>Detalle de Ventas</p>
          <p className="text-xs" style={{ color: B.muted }}>
            Mostrando las últimas {limite} ventas
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 680 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${B.cream}` }}>
              {['Fecha', 'Cliente', 'Vendedor', 'Comprobante', 'Método Pago', 'Items', 'Total'].map(h => (
                <th
                  key={h}
                  className="text-left pb-3 text-xs font-black uppercase tracking-widest"
                  style={{ color: B.muted }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ventas.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm" style={{ color: B.muted }}>
                  Sin ventas en el período
                </td>
              </tr>
            ) : (
              ventas.map(v => {
                const colorComp = COLORES_COMPROBANTE[v.tipo_comprobante] ?? B.charcoal;
                const colorPago = COLORES_METODO[v.metodo_pago] ?? B.charcoal;
                return (
                  <tr
                    key={v.id}
                    style={{ borderBottom: `1px solid ${B.cream}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${B.cream}50`)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 shrink-0" style={{ color: B.muted }} />
                        <span className="text-sm" style={{ color: B.charcoal }}>
                          {fmtFecha(v.fecha_local)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm font-semibold" style={{ color: B.charcoal }}>
                        {v.cliente_nombre}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-sm" style={{ color: B.charcoal }}>
                      {v.usuario_nombre}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ background: `${colorComp}18`, color: colorComp }}
                      >
                        {LABEL_COMPROBANTE[v.tipo_comprobante] ?? v.tipo_comprobante}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm" style={{ color: B.charcoal }}>
                          {LABEL_METODO[v.metodo_pago] ?? v.metodo_pago}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3" style={{ color: B.muted }} />
                        <span className="text-sm" style={{ color: B.charcoal }}>
                          {v.items_count} uds
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-sm font-black" style={{ color: B.charcoal }}>
                      {fmtSoles(v.total)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}