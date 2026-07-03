// components/usuarios/UsuariosFiltros.tsx
'use client';

import { Search } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';
import type { EstadoFiltro, RolFiltro } from '@/constants/usuarios/constants';

interface UsuariosFiltrosProps {
  busqueda:       string;
  rolFiltro:      RolFiltro;
  estadoFiltro:   EstadoFiltro;
  onBusqueda:     (v: string) => void;
  onRolFiltro:    (v: RolFiltro) => void;
  onEstadoFiltro: (v: EstadoFiltro) => void;
}

export function UsuariosFiltros({
  busqueda, rolFiltro, estadoFiltro,
  onBusqueda, onRolFiltro, onEstadoFiltro,
}: UsuariosFiltrosProps) {
  const selectStyle = {
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
            placeholder="Buscar por nombre, email o DNI..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={selectStyle}
          />
        </div>

        {/* Rol */}
        <select
          value={rolFiltro}
          onChange={e => onRolFiltro(e.target.value as RolFiltro)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none"
          style={selectStyle}
        >
          <option value="todos">Todos los roles</option>
          <option value="admin">Administrador</option>
          <option value="cajero">Cajero</option>
          <option value="cocinero">Cocinero</option>
        </select>

        {/* Estado */}
        <select
          value={estadoFiltro}
          onChange={e => onEstadoFiltro(e.target.value as EstadoFiltro)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none"
          style={selectStyle}
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>
    </Card>
  );
}