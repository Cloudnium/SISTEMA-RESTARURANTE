// components/reportes/ReportesTopProductosYCategorias.tsx
'use client';

import React from 'react';
import { TrendingUp, Tag } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';
import { fmtSoles, avatarColor } from '@/utils/reportes/reportesUtils';
import type { ReporteTopProductos, ReporteTopCategorias } from '@/lib/supabase/queries/reportes';

// ─── Top Productos ────────────────────────────────────────────────────────────
interface TopProductosProps {
  productos: ReporteTopProductos[];
}

export function ReportesTopProductos({ productos }: TopProductosProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: B.terra }} />
          <p className="text-sm font-bold" style={{ color: B.charcoal }}>Top Productos</p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${B.gold}18` }}
        >
          <span className="text-[10px] font-black" style={{ color: B.gold }}>★</span>
        </div>
      </div>

      {productos.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: B.muted }}>Sin datos en el período</p>
      ) : (
        <div className="space-y-3">
          {productos.map((p, i) => (
            <div key={p.producto_id} className="flex items-center gap-3">
              {/* Posición */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black"
                style={{ background: avatarColor(i), color: B.white }}
              >
                {i + 1}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-semibold truncate" style={{ color: B.charcoal }}>
                    {p.nombre}
                  </p>
                  <p className="text-sm font-black shrink-0 ml-2" style={{ color: B.charcoal }}>
                    {fmtSoles(p.total)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${B.green}15`, color: B.green }}
                  >
                    {p.categoria}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: B.cream }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p.pct}%`, background: B.terra }}
                    />
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: B.muted }}>
                    {p.qty} uds.
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

// ─── Top Categorías ───────────────────────────────────────────────────────────
interface TopCategoriasProps {
  categorias: ReporteTopCategorias[];
}

const CAT_COLORS = [B.green, B.gold, B.terra, B.charcoalLight, B.muted];

export function ReportesTopCategorias({ categorias }: TopCategoriasProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4" style={{ color: B.green }} />
          <p className="text-sm font-bold" style={{ color: B.charcoal }}>Top Categorías</p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${B.green}18` }}
        >
          <span className="text-[10px] font-black" style={{ color: B.green }}>↗</span>
        </div>
      </div>

      {categorias.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: B.muted }}>Sin datos en el período</p>
      ) : (
        <div className="space-y-3">
          {categorias.slice(0, 5).map((cat, i) => {
            const color = CAT_COLORS[i % CAT_COLORS.length];
            return (
              <div key={cat.categoria}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `${color}20`, color }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: B.charcoal }}>
                      {cat.categoria}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black" style={{ color: B.charcoal }}>
                      {cat.pct.toFixed(1)}%
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${color}15`, color }}
                    >
                      {cat.qty} uds
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: B.cream }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${cat.pct}%`, background: color }}
                  />
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: B.muted }}>
                  Total: {fmtSoles(cat.total)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}