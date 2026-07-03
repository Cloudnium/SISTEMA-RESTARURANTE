// components/compras/components/ComprasFiltro.tsx
'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';
import { inputCls, INP } from '@/utils/compras/comprasUtils';
import { TIPOS_COMP } from '@/constants/compras/comprasConstants';
import type { TipoComprobanteCompra } from '@/lib/supabase/types';

interface ComprasFiltroProps {
  busqueda:       string;
  tipoFiltro:     'todos' | TipoComprobanteCompra;
  onBusqueda:     (v: string) => void;
  onTipoFiltro:   (v: 'todos' | TipoComprobanteCompra) => void;
}

export function ComprasFiltro({
  busqueda,
  tipoFiltro,
  onBusqueda,
  onTipoFiltro,
}: ComprasFiltroProps) {
  return (
    <Card className="mb-4">
      <div className="flex gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: B.muted }}
          />
          <input
            value={busqueda}
            onChange={e => onBusqueda(e.target.value)}
            placeholder="Buscar por proveedor, RUC, serie o número..."
            className={inputCls('pl-9')}
            style={INP}
          />
        </div>

        {/* Tipo */}
        <select
          value={tipoFiltro}
          onChange={e => onTipoFiltro(e.target.value as typeof tipoFiltro)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none"
          style={INP}
        >
          <option value="todos">Todos</option>
          {TIPOS_COMP.map(t => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </Card>
  );
}