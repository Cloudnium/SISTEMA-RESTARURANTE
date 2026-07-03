// components/reportes/ReportesKpis.tsx
'use client';

import React from 'react';
import {
  DollarSign, TrendingDown, Scale, ShoppingCart,
  FileText, Package,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { fmtSoles } from '@/utils/reportes/reportesUtils';
import { ReporteResumenPeriodo } from '@/lib/supabase/queries/reportes';

interface ReportesKpisProps {
  resumen: ReporteResumenPeriodo | null;
}

function KpiBig({
  label, value, sub, subValue, icon: Icon, color, tag, tagColor,
}: {
  label:     string;
  value:     string;
  sub?:      string;
  subValue?: string;
  icon:      React.ElementType;
  color:     string;
  tag?:      string;
  tagColor?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-2"
      style={{ background: B.white, border: `1px solid ${B.cream}` }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}18` }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        {tag && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${tagColor ?? color}18`, color: tagColor ?? color }}
          >
            {tag}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: B.muted }}>
          {label}
        </p>
        <p className="text-2xl font-black mt-0.5 leading-tight" style={{ color: B.charcoal }}>
          {value}
        </p>
        {sub && (
          <p className="text-[11px] mt-1" style={{ color: B.muted }}>
            {sub}:{' '}
            <span style={{ color: B.charcoal, fontWeight: 700 }}>{subValue}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function ReportesKpis({ resumen }: ReportesKpisProps) {
  const r = resumen;

  const diferencia = (r?.totalVentas ?? 0) - (r?.totalCompras ?? 0);
  const esPositivo = diferencia >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
      <KpiBig
        label="Ventas Totales (Ingresos)"
        value={fmtSoles(r?.totalVentas ?? 0)}
        sub="Ticket promedio"
        subValue={fmtSoles(r?.ticketPromedio ?? 0)}
        icon={DollarSign}
        color={B.green}
        tag="Ventas"
        tagColor={B.green}
      />
      <KpiBig
        label="Egresos"
        value={fmtSoles(r?.totalCompras ?? 0)}
        sub="Total compras"
        subValue={fmtSoles(r?.totalCompras ?? 0)}
        icon={TrendingDown}
        color={B.terra}
        tag="Compras"
        tagColor={B.terra}
      />
      <KpiBig
        label="Diferencia"
        value={`${esPositivo ? '+' : ''}${fmtSoles(diferencia)}`}
        sub="Ingresos − Egresos"
        subValue={`${esPositivo ? '+' : ''}${fmtSoles(diferencia)}`}
        icon={Scale}
        color={esPositivo ? B.green : B.terra}
        tag={esPositivo ? 'Superávit' : 'Déficit'}
        tagColor={esPositivo ? B.green : B.terra}
      />
      <KpiBig
        label="Productos Vendidos"
        value={String(r?.totalProductos ?? 0)}
        sub="Productos únicos"
        subValue={String(r?.totalProductosUnicos ?? 0)}
        icon={ShoppingCart}
        color={B.gold}
        tag={r?.totalProductosUnicos ? `${r.totalProductosUnicos} SKU` : undefined}
        tagColor={B.gold}
      />
      <KpiBig
        label="Comprobantes"
        value={String(r?.totalComprobantes ?? 0)}
        sub="Total ventas"
        subValue={String(r?.totalTransacciones ?? 0)}
        icon={FileText}
        color={B.charcoalLight}
        tag="Emitidos"
        tagColor={B.charcoalLight}
      />
      <KpiBig
        label="Inventario"
        value={fmtSoles(r?.totalInventario ?? 0)}
        sub="Total productos"
        subValue={String(r?.totalProductosStock ?? 0)}
        icon={Package}
        color={B.terra}
        tag="Stock"
        tagColor={B.terra}
      />
    </div>
  );
}