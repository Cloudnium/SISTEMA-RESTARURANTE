// components/dashboard/DashboardCharts.tsx
'use client';

import React, { useMemo } from 'react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';

export interface TopProductoHoy {
  producto_id: string;
  nombre:      string;
  qty:         number;
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function agruparPorDia(
  data: Array<{ total: number; fecha_local: string }>,
): Array<{ dia: string; total: number }> {
  return DIAS.map((dia, i) => {
    const dayNum = i === 6 ? 0 : i + 1;
    const total = data
      .filter(v => new Date(v.fecha_local + 'T00:00:00').getDay() === dayNum)
      .reduce((a, v) => a + v.total, 0);
    return { dia, total };
  });
}

function GraficoVentasSemana({
  data,
}: {
  data: Array<{ total: number; fecha_local: string }>;
}) {
  const puntos = useMemo(() => agruparPorDia(data), [data]);
  const maxVal = Math.max(...puntos.map(p => p.total), 1);
  const tieneData = puntos.some(p => p.total > 0);

  const W = 500; const H = 160;          // ← H subió de 130→160 para dar aire
  const PAD_LEFT = 44; const PAD_RIGHT = 12;
  const PAD_TOP = 24;  const PAD_BOTTOM = 32; // ← más aire arriba y abajo
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const coords = puntos.map((p, i) => ({
    x: PAD_LEFT + (i / (puntos.length - 1)) * innerW,
    y: PAD_TOP + (1 - p.total / maxVal) * innerH,
    total: p.total,
    dia: p.dia,
  }));

  const linePoints = coords.map(c => `${c.x},${c.y}`).join(' ');

  const areaPath =
    `M ${coords[0].x},${coords[0].y} ` +
    coords.slice(1).map(c => `L ${c.x},${c.y}`).join(' ') +
    ` L ${coords[coords.length - 1].x},${PAD_TOP + innerH}` +
    ` L ${coords[0].x},${PAD_TOP + innerH} Z`;

  const yMarks = [0, 0.33, 0.66, 1].map(pct => ({
    y:   PAD_TOP + (1 - pct) * innerH,
    val: Math.round(maxVal * pct),
  }));

  return (
    <div>
      <p className="text-sm font-bold mb-0.5" style={{ color: B.charcoal }}>
        Ventas de la Semana
      </p>
      <p className="text-xs mb-3" style={{ color: B.muted }}>
        Lunes a Domingo · ingresos en S/
      </p>

      {!tieneData ? (
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ height: 160, background: `${B.cream}60` }}
        >
          <p className="text-xs" style={{ color: B.muted }}>Sin ventas esta semana aún</p>
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 160, overflow: 'visible' }} // ← height acompaña al H
        >
          {yMarks.map((m, i) => (
            <g key={i}>
              <line
                x1={PAD_LEFT} y1={m.y} x2={W - PAD_RIGHT} y2={m.y}
                stroke={`${B.charcoal}14`} strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 6} y={m.y + 4}
                fontSize={12} fill={B.muted} textAnchor="end" fontWeight={500} // ← era 9
              >
                {m.val > 0 ? `S/${m.val.toFixed(0)}` : ''}
              </text>
            </g>
          ))}

          <defs>
            <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={B.green} stopOpacity="0.22" />
              <stop offset="100%" stopColor={B.green} stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill="url(#gradArea)" />

          <polyline
            points={linePoints}
            fill="none"
            stroke={B.green}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {coords.map((c, idx) => (
            <g key={c.dia}>
              {c.total > 0 && (
                <circle cx={c.x} cy={c.y} r={3.5} fill={B.green} />
              )}
              <text
                x={c.x} y={PAD_TOP + innerH + 20}
                fontSize={12} fill={B.muted} textAnchor="middle" fontWeight={500} // ← era 10
              >
                {c.dia}
              </text>
              {c.total > 0 && (
                <text
                  x={c.x}
                  y={c.y - 8}
                  fontSize={12}           // ← era 8
                  fill={B.green}
                  // primer punto ancla a la izquierda para no chocar con eje Y
                  textAnchor={idx === 0 ? 'start' : 'middle'}
                  fontWeight={600}
                >
                  S/{c.total.toFixed(2)}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

const BAR_COLORS = [B.terra, B.green, B.gold, B.charcoalLight, B.muted];

function GraficoTopProductos({ productos }: { productos: TopProductoHoy[] }) {
  const maxQty = Math.max(...productos.map(p => p.qty), 1);

  const W = 380; const H = 160;          // ← H subió de 130→160
  const PAD_LEFT = 10; const PAD_RIGHT = 10;
  const PAD_TOP = 22;  const PAD_BOTTOM = 32; // ← más aire
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const barW = Math.min(40, (innerW / Math.max(productos.length, 1)) * 0.6);
  const slot = innerW / Math.max(productos.length, 1);

  return (
    <div>
      <p className="text-sm font-bold mb-0.5" style={{ color: B.charcoal }}>
        Más Vendidos Hoy
      </p>
      <p className="text-xs mb-3" style={{ color: B.muted }}>
        Top 5 productos · unidades
      </p>

      {productos.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ height: 160, background: `${B.cream}60` }}
        >
          <p className="text-xs" style={{ color: B.muted }}>
            Las ventas de hoy aparecerán aquí
          </p>
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 160, overflow: 'visible' }} // ← height acompaña al H
        >
          <line
            x1={PAD_LEFT} y1={PAD_TOP + innerH}
            x2={W - PAD_RIGHT} y2={PAD_TOP + innerH}
            stroke={`${B.charcoal}20`} strokeWidth={1}
          />

          {productos.map((p, i) => {
            const barH = Math.max((p.qty / maxQty) * innerH, 4);
            const cx   = PAD_LEFT + i * slot + slot / 2;
            const x    = cx - barW / 2;
            const y    = PAD_TOP + innerH - barH;
            const nombre = p.nombre.length > 8 ? p.nombre.slice(0, 7) + '…' : p.nombre;
            return (
              <g key={p.producto_id}>
                <rect
                  x={x} y={y} width={barW} height={barH}
                  rx={4} ry={4}
                  fill={BAR_COLORS[i % BAR_COLORS.length]}
                  opacity={0.88}
                />
                <text
                  x={cx} y={y - 6}
                  fontSize={12} fill={BAR_COLORS[i % BAR_COLORS.length]} // ← era 9
                  textAnchor="middle" fontWeight={700}
                >
                  {p.qty}
                </text>
                <text
                  x={cx} y={PAD_TOP + innerH + 20}
                  fontSize={12} fill={B.muted}  // ← era 9
                  textAnchor="middle"
                >
                  {nombre}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

interface DashboardChartsProps {
  ventasSemana:    Array<{ total: number; fecha_local: string }>;
  topProductosHoy: TopProductoHoy[];
}

export function DashboardCharts({ ventasSemana, topProductosHoy }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
      <Card>
        <GraficoVentasSemana data={ventasSemana} />
      </Card>
      <Card>
        <GraficoTopProductos productos={topProductosHoy} />
      </Card>
    </div>
  );
}