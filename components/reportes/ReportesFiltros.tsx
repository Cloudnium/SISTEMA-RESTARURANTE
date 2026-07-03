// components/reportes/ReportesFiltros.tsx
'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';
import { RANGOS_RAPIDOS } from '@/constants/reportes/reportesConstants';
import {
  fechaLima, rangoSemanaActual, rangoMesActual, rangoUltimosMeses,
} from '@/utils/reportes/reportesUtils';

interface ReportesFiltrosProps {
  desde:        string;
  hasta:        string;
  onDesde:      (v: string) => void;
  onHasta:      (v: string) => void;
}

const INP: React.CSSProperties = {
  background: B.cream,
  border:     `1px solid ${B.creamDark}`,
  color:      B.charcoal,
};

export function ReportesFiltros({ desde, hasta, onDesde, onHasta }: ReportesFiltrosProps) {
  const setRango = (label: string) => {
    switch (label) {
      case 'Hoy': {
        const hoy = fechaLima(0);
        onDesde(hoy);
        onHasta(hoy);
        break;
      }
      case 'Semana': {
        const { inicio, fin } = rangoSemanaActual();
        onDesde(inicio);
        onHasta(fin);
        break;
      }
      case 'Mes': {
        const { inicio, fin } = rangoMesActual();
        onDesde(inicio);
        onHasta(fin);
        break;
      }
      case '3 meses': {
        const { inicio, fin } = rangoUltimosMeses(3);
        onDesde(inicio);
        onHasta(fin);
        break;
      }
    }
  };

  return (
    <Card className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${B.green}18` }}
        >
          <Calendar className="w-4 h-4" style={{ color: B.green }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: B.charcoal }}>Filtros de Reporte</p>
          <p className="text-xs" style={{ color: B.muted }}>Personaliza tu análisis de datos</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        {/* Desde */}
        <div className="flex-1 min-w-140px">
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
            Desde
          </label>
          <input
            type="date"
            value={desde}
            onChange={e => onDesde(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={INP}
          />
        </div>

        {/* Hasta */}
        <div className="flex-1 min-w-140px">
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
            Hasta
          </label>
          <input
            type="date"
            value={hasta}
            onChange={e => onHasta(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={INP}
          />
        </div>

        {/* Rangos rápidos */}
        <div className="flex gap-1.5 flex-wrap">
          {RANGOS_RAPIDOS.map(r => (
            <button
              key={r.label}
              onClick={() => setRango(r.label)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={{ background: `${B.green}18`, color: B.green }}
              onMouseEnter={e => {
                e.currentTarget.style.background = B.green;
                e.currentTarget.style.color      = B.cream;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = `${B.green}18`;
                e.currentTarget.style.color      = B.green;
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}