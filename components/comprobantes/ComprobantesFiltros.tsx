// components/comprobantes/ComprobantesFiltros.tsx
'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';
import type { TipoFiltro, EstadoFiltro } from '@/constants/comprobantes/comprobantesConstants';

interface Props {
  busqueda:     string;
  tipoFiltro:   TipoFiltro;
  estadoFiltro: EstadoFiltro;
  totalFiltrado: number;
  totalLista:    number;
  onBusqueda:     (v: string) => void;
  onTipo:         (v: TipoFiltro) => void;
  onEstado:       (v: EstadoFiltro) => void;
  onLimpiar:      () => void;
}

export function ComprobantesFiltros({
  busqueda, tipoFiltro, estadoFiltro,
  totalFiltrado, totalLista,
  onBusqueda, onTipo, onEstado, onLimpiar,
}: Props) {
  const hayFiltros = busqueda || tipoFiltro !== 'todos' || estadoFiltro !== 'todos';

  const inputStyle = {
    background: B.cream,
    border: `1px solid ${B.creamDark}`,
    color: B.charcoal,
  };

  return (
    <Card className="mb-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Búsqueda */}
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: B.muted }}
          />
          <input
            value={busqueda}
            onChange={e => onBusqueda(e.target.value)}
            placeholder="Número, cliente, DNI, RUC o usuario…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
        </div>

        {/* Tipo */}
        <select
          value={tipoFiltro}
          onChange={e => onTipo(e.target.value as TipoFiltro)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none"
          style={inputStyle}
        >
          <option value="todos">Todos los tipos</option>
          <option value="boleta">Boletas</option>
          <option value="nota_venta">Notas de Venta</option>
          <option value="factura">Facturas</option>
        </select>

        {/* Estado */}
        <select
          value={estadoFiltro}
          onChange={e => onEstado(e.target.value as EstadoFiltro)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none"
          style={inputStyle}
        >
          <option value="todos">Todos los estados</option>
          <option value="emitido">Emitidos</option>
          <option value="anulado">Anulados</option>
        </select>
      </div>

      {/* Resumen filtros activos */}
      {hayFiltros && (
        <div
          className="flex items-center justify-between mt-3 pt-3 border-t"
          style={{ borderColor: B.creamDark }}
        >
          <p className="text-xs" style={{ color: B.muted }}>
            <strong>{totalFiltrado}</strong> de <strong>{totalLista}</strong> comprobantes
          </p>
          <button
            onClick={onLimpiar}
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: B.terra }}
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        </div>
      )}
    </Card>
  );
}