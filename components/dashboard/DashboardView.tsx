//componentes/DashboardView.tsx
'use client';

import React from 'react';
import { RefreshCw, DollarSign, Coffee, Users, Package, Receipt } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, KpiCard, PageHeader, Btn, ProgressBar } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WeekDay { d: string; v: number; }
interface TopProduct { n: string; v: number; }
interface RecentSale { n: string; h: string; t: string; tipo: 'boleta' | 'nota'; }

// ─── Static data (replace with real API calls) ────────────────────────────────
const WEEK_DATA: WeekDay[] = [
  { d: 'Lun', v: 620 }, { d: 'Mar', v: 780 }, { d: 'Mié', v: 540 },
  { d: 'Jue', v: 890 }, { d: 'Vie', v: 1020 }, { d: 'Sáb', v: 1240 }, { d: 'Dom', v: 430 },
];

const TOP_PRODUCTS: TopProduct[] = [
  { n: 'Keke de Vainilla',   v: 148 },
  { n: 'Brownie Chocolate',  v: 122 },
  { n: 'Café Americano',     v: 98 },
  { n: 'Cheesecake Fresa',   v: 87 },
  { n: 'Torta Tres Leches',  v: 76 },
];

const RECENT_SALES: RecentSale[] = [
  { n: 'NV01-00002879', h: 'Hoy, 07:29 p.m.', t: '8.00',  tipo: 'nota' },
  { n: 'NV01-00002878', h: 'Hoy, 06:55 p.m.', t: '24.00', tipo: 'boleta' },
  { n: 'NV01-00002877', h: 'Hoy, 06:12 p.m.', t: '15.50', tipo: 'boleta' },
  { n: 'NV01-00002876', h: 'Hoy, 05:48 p.m.', t: '32.00', tipo: 'nota' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function WeekChart({ data }: { data: WeekDay[] }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div key={d.d} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-lg"
            style={{
              height: `${(d.v / max) * 100}%`,
              background: d.d === 'Sáb' ? B.terra : B.green,
              opacity: 0.85,
            }}
          />
          <span className="text-[10px] font-semibold" style={{ color: B.muted }}>{d.d}</span>
        </div>
      ))}
    </div>
  );
}

function TopList({ items }: { items: TopProduct[] }) {
  const max = items[0]?.v ?? 1;
  return (
    <div className="space-y-3">
      {items.map((p, i) => (
        <div key={p.n}>
          <div className="flex justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black" style={{ color: B.gold }}>#{i + 1}</span>
              <span className="text-xs font-medium" style={{ color: B.charcoal }}>{p.n}</span>
            </div>
            <span className="text-xs font-bold" style={{ color: B.charcoal }}>{p.v}</span>
          </div>
          <ProgressBar pct={(p.v / max) * 100} color={B.terra} height={6} />
        </div>
      ))}
    </div>
  );
}

function SaleRow({ sale }: { sale: RecentSale }) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0"
      style={{ borderColor: B.cream }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${B.charcoal}12` }}
        >
          <Receipt className="w-4 h-4" style={{ color: B.charcoal }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{sale.n}</p>
          <p className="text-xs" style={{ color: B.muted }}>{sale.h}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={
            sale.tipo === 'boleta'
              ? { background: '#e8f5e2', color: B.green }
              : { background: '#fdf8e6', color: B.gold }
          }
        >
          {sale.tipo === 'boleta' ? 'Boleta' : 'Nota de Venta'}
        </span>
        <p className="text-sm font-bold" style={{ color: B.charcoal }}>S/ {sale.t}</p>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function DashboardView() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Vista general del restaurante · sábado, 2 de mayo de 2026"
        action={
          <Btn>
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Btn>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Ventas Hoy"     value="S/ 887.50" sub="101 transacciones"   trend={12}  icon={DollarSign} color={B.green} />
        <KpiCard label="Platos Vendidos" value="212"      sub="Productos únicos: 5" trend={8}   icon={Coffee}     color={B.terra} />
        <KpiCard label="Clientes Hoy"   value="89"        sub="Ticket prom: S/ 8.79" trend={-3}  icon={Users}      color={B.gold} />
        <KpiCard label="Insumos Bajos"  value="7"         sub="Requieren atención"  trend={-15} icon={Package}    color={B.charcoal} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <p className="text-sm font-bold mb-1" style={{ color: B.charcoal }}>Ventas de la Semana</p>
          <p className="text-xs mb-4" style={{ color: B.muted }}>Lunes a Domingo (se reinicia cada semana)</p>
          <WeekChart data={WEEK_DATA} />
        </Card>
        <Card>
          <p className="text-sm font-bold mb-4" style={{ color: B.charcoal }}>Postres más Vendidos</p>
          <TopList items={TOP_PRODUCTS} />
        </Card>
      </div>

      {/* Recent sales */}
      <Card>
        <p className="text-sm font-bold mb-4" style={{ color: B.charcoal }}>Ventas Recientes</p>
        {RECENT_SALES.map((s) => <SaleRow key={s.n} sale={s} />)}
      </Card>
    </div>
  );
}