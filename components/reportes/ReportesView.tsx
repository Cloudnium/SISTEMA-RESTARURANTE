//componentes/ReportesView.tsx
'use client';

import React, { useState } from 'react';
import { Download, DollarSign, Coffee, TrendingUp, BarChart3, ShoppingBasket } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn, ProgressBar } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DayData    { d: string; v: number; }
interface Plato      { nombre: string; qty: number; total: number; }
interface InsumoUso  { nombre: string; uso: number; unidad: string; }

// ─── Static data ─────────────────────────────────────────────────────────────
const SEMANA: DayData[] = [
  { d: 'Lun', v: 620 }, { d: 'Mar', v: 780 }, { d: 'Mié', v: 540 },
  { d: 'Jue', v: 890 }, { d: 'Vie', v: 1020}, { d: 'Sáb', v: 1240}, { d: 'Dom', v: 430 },
];

const PLATOS_TOP: Plato[] = [
  { nombre: 'Keke de Vainilla',    qty: 148, total: 1184 },
  { nombre: 'Brownie de Chocolate',qty: 122, total: 976  },
  { nombre: 'Café Americano',      qty: 98,  total: 490  },
  { nombre: 'Cheesecake Fresa',    qty: 87,  total: 1044 },
  { nombre: 'Torta Tres Leches',   qty: 76,  total: 1216 },
];

const INSUMOS_TOP: InsumoUso[] = [
  { nombre: 'Harina sin preparar', uso: 48,  unidad: 'kg'       },
  { nombre: 'Azúcar blanca',       uso: 38,  unidad: 'kg'       },
  { nombre: 'Leche entera',        uso: 35,  unidad: 'litros'   },
  { nombre: 'Huevos',              uso: 240, unidad: 'unidades' },
  { nombre: 'Chocolate bitter',    uso: 22,  unidad: 'kg'       },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function WeekBar({ data }: { data: DayData[] }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div key={d.d} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px]" style={{ color: B.muted }}>S/{d.v}</span>
          <div
            className="w-full rounded-t-lg"
            style={{ height: `${(d.v / max) * 100}%`, background: d.d === 'Sáb' ? B.terra : B.green, opacity: 0.85 }}
          />
          <span className="text-xs font-bold" style={{ color: B.charcoal }}>{d.d}</span>
        </div>
      ))}
    </div>
  );
}

function RankedList<T extends { nombre: string }>({
  items,
  getValue,
  getLabel,
  color,
}: {
  items: T[];
  getValue: (item: T) => number;
  getLabel: (item: T) => string;
  color: string;
}) {
  const max = getValue(items[0] ?? ({} as T)) || 1;
  return (
    <div>
      {items.map((item, i) => (
        <div
          key={item.nombre}
          className="flex items-center gap-3 py-2 border-b last:border-0"
          style={{ borderColor: B.cream }}
        >
          <span className="text-xs font-black w-5 text-right shrink-0" style={{ color: B.gold }}>
            #{i + 1}
          </span>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-semibold" style={{ color: B.charcoal }}>{item.nombre}</span>
              <span className="text-sm font-bold" style={{ color: B.charcoal }}>{getLabel(item)}</span>
            </div>
            <ProgressBar pct={(getValue(item) / max) * 100} color={color} height={6} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ReportesView() {
  const [_periodo, setPeriodo] = useState<'semana' | 'mes'>('semana');
  const totalSemana = SEMANA.reduce((a, d) => a + d.v, 0);

  return (
    <div>
      <PageHeader
        title="Reportes y Análisis"
        subtitle="Estadísticas de ventas, postres e insumos"
        action={
          <div className="flex gap-2">
            <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${B.cream}` }}>
              {(['semana', 'mes'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setPeriodo(k)}
                  className="px-4 py-2 text-sm font-medium capitalize"
                  style={_periodo === k ? { background: B.charcoal, color: B.cream } : { background: B.white, color: B.charcoal }}
                >
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
          { label: 'Ingresos Semana', value: `S/ ${totalSemana.toLocaleString()}`, icon: DollarSign, color: B.green },
          { label: 'Platos Vendidos', value: '687',                                 icon: Coffee,     color: B.terra },
          { label: 'Ticket Promedio', value: 'S/ 8.79',                             icon: TrendingUp, color: B.gold },
          { label: 'Mejor Día',       value: 'Sábado',                              icon: BarChart3,  color: B.charcoal },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: B.white, border: `1px solid ${B.cream}` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: B.muted }}>{label}</p>
              <p className="text-lg font-bold" style={{ color: B.charcoal }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Week chart */}
      <Card className="mb-5">
        <p className="text-sm font-bold mb-1" style={{ color: B.charcoal }}>Ventas por Día de la Semana</p>
        <p className="text-xs mb-4" style={{ color: B.muted }}>Ingresos en soles</p>
        <WeekBar data={SEMANA} />
      </Card>

      {/* Ranked lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${B.terra}18` }}>
              <Coffee className="w-3.5 h-3.5" style={{ color: B.terra }} />
            </div>
            <p className="text-sm font-bold" style={{ color: B.charcoal }}>Postres y Platos más Vendidos</p>
          </div>
          <RankedList
            items={PLATOS_TOP}
            getValue={(p) => p.qty}
            getLabel={(p) => `S/ ${p.total} · ${p.qty} und.`}
            color={B.terra}
          />
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${B.gold}18` }}>
              <ShoppingBasket className="w-3.5 h-3.5" style={{ color: B.gold }} />
            </div>
            <p className="text-sm font-bold" style={{ color: B.charcoal }}>Insumos más Usados en Preparación</p>
          </div>
          <RankedList
            items={INSUMOS_TOP}
            getValue={(i) => i.uso}
            getLabel={(i) => `${i.uso} ${i.unidad}`}
            color={B.gold}
          />
        </Card>
      </div>
    </div>
  );
}