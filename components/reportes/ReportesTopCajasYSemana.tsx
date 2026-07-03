// components/reportes/ReportesTopCajasYSemana.tsx
'use client';

import React from 'react';
import { Users, Calendar } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';
import { fmtSoles, iniciales, avatarColor } from '@/utils/reportes/reportesUtils';
import type { ReporteTopUsuarios, ReporteVentasSemanal } from '@/lib/supabase/queries/reportes';

// ─── Top Cajas ────────────────────────────────────────────────────────────────
interface TopCajasProps {
  usuarios: ReporteTopUsuarios[];
}

export function ReportesTopCajas({ usuarios }: TopCajasProps) {
  const maxTotal = usuarios[0]?.total ?? 1;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: B.green }} />
          <p className="text-sm font-bold" style={{ color: B.charcoal }}>Top 5 Cajas</p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${B.green}18` }}
        >
          <span className="text-[10px] font-black" style={{ color: B.green }}>↗</span>
        </div>
      </div>

      {usuarios.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: B.muted }}>Sin datos en el período</p>
      ) : (
        <div className="space-y-3">
          {usuarios.slice(0, 5).map((u, i) => (
            <div key={u.usuario_id} className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
                style={{ background: avatarColor(i), color: B.white }}
              >
                {iniciales(u.nombre)}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-semibold truncate" style={{ color: B.charcoal }}>
                    {u.nombre}
                  </p>
                  <p className="text-sm font-black shrink-0 ml-2" style={{ color: B.charcoal }}>
                    {fmtSoles(u.total)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
                    style={{ background: `${B.green}15`, color: B.green }}
                  >
                    {u.rol}
                  </span>
                  <span className="text-[10px]" style={{ color: B.muted }}>
                    · {u.ventas} ventas
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: B.cream }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${u.pct}%`, background: B.green }}
                    />
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: B.muted }}>
                    {u.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 flex items-center gap-1" style={{ borderTop: `1px solid ${B.cream}` }}>
        <Users className="w-3 h-3" style={{ color: B.muted }} />
        <p className="text-xs" style={{ color: B.muted }}>
          Total de cajas activas:{' '}
          <span style={{ color: B.charcoal, fontWeight: 700 }}>{usuarios.length}</span>
        </p>
      </div>
    </Card>
  );
}

// ─── Ventas Semanales ─────────────────────────────────────────────────────────
interface VentasSemanalesProps {
  semanas: ReporteVentasSemanal[];
}

export function ReportesVentasSemanales({ semanas }: VentasSemanalesProps) {
  const totalSemanas  = semanas.length;
  const totalGeneral  = semanas.reduce((s, w) => s + w.total, 0);
  const promSemanal   = totalSemanas > 0 ? totalGeneral / totalSemanas : 0;
  const maxTotal      = Math.max(...semanas.map(s => s.total), 1);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: B.green }} />
          <p className="text-sm font-bold" style={{ color: B.charcoal }}>Ventas Semanales</p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${B.green}18` }}
        >
          <span className="text-[10px] font-black" style={{ color: B.green }}>↗</span>
        </div>
      </div>

      {semanas.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: B.muted }}>Sin semanas en el período</p>
      ) : (
        <div className="space-y-3">
          {semanas.slice(-4).map(s => (
            <div key={s.inicio}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" style={{ color: B.muted }} />
                  <span className="text-xs font-semibold" style={{ color: B.charcoal }}>
                    {s.semana}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black" style={{ color: B.charcoal }}>
                    {fmtSoles(s.total)}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${B.green}15`, color: B.green }}
                  >
                    {s.cantidad}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ background: B.cream }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(s.total / maxTotal) * 100}%`, background: B.green }}
                  />
                </div>
                <span className="text-[10px] shrink-0" style={{ color: B.muted }}>
                  ~ Promedio diario: {fmtSoles(s.total / 7)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="mt-4 pt-3 grid grid-cols-2 gap-3"
        style={{ borderTop: `1px solid ${B.cream}` }}
      >
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: B.cream }}
        >
          <p className="text-xs" style={{ color: B.muted }}>Total Semanas</p>
          <p className="text-lg font-black" style={{ color: B.charcoal }}>{totalSemanas}</p>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: B.cream }}
        >
          <p className="text-xs" style={{ color: B.muted }}>Promedio Semanal</p>
          <p className="text-sm font-black" style={{ color: B.green }}>{fmtSoles(promSemanal)}</p>
        </div>
      </div>
    </Card>
  );
}