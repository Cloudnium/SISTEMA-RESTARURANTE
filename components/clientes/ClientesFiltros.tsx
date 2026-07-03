// components/clientes/ClientesFiltros.tsx
'use client';

import { Search } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';
import type { TipoCliente } from '@/lib/supabase/types';

interface ClientesFiltrosProps {
  busqueda:       string;
  tipoFiltro:     'todos' | TipoCliente;
  onBusqueda:     (v: string) => void;
  onTipoFiltro:   (v: 'todos' | TipoCliente) => void;
}

export function ClientesFiltros({
  busqueda, tipoFiltro, onBusqueda, onTipoFiltro,
}: ClientesFiltrosProps) {
  const inputStyle = {
    background: B.cream,
    border: `1px solid ${B.creamDark}`,
    color: B.charcoal,
  };

  return (
    <Card className="mb-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Buscador */}
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: B.muted }}
          />
          <input
            value={busqueda}
            onChange={e => onBusqueda(e.target.value)}
            placeholder="Buscar por nombre, RUC, DNI..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
        </div>

        {/* Selector tipo */}
        <select
          value={tipoFiltro}
          onChange={e => onTipoFiltro(e.target.value as typeof tipoFiltro)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none"
          style={inputStyle}
        >
          <option value="todos">Todos</option>
          <option value="persona">Personas</option>
          <option value="empresa">Empresas</option>
        </select>
      </div>
    </Card>
  );
}