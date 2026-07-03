// components/clientes/ClientesFila.tsx
'use client';

import { Star, UserCircle, Building2, Edit, Trash2 } from 'lucide-react';
import { B } from '@/lib/brand';
import type { Cliente } from '@/lib/supabase/types';

interface ClientesFilaProps {
  cliente:      Cliente;
  onEditar:     (c: Cliente) => void;
  onEliminar:   (id: string) => void;
}

export function ClientesFila({ cliente: c, onEditar, onEliminar }: ClientesFilaProps) {
  const esPersona = c.tipo === 'persona';

  return (
    <tr
      style={{ borderTop: `1px solid ${B.cream}` }}
      onMouseEnter={e => (e.currentTarget.style.background = `${B.cream}50`)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Tipo */}
      <td className="px-4 py-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: esPersona ? `${B.green}18` : `${B.gold}18` }}
        >
          {esPersona
            ? <UserCircle className="w-4 h-4" style={{ color: B.green }} />
            : <Building2  className="w-4 h-4" style={{ color: B.gold  }} />
          }
        </div>
      </td>

      {/* Nombre */}
      <td className="px-4 py-3">
        <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{c.nombre}</p>
        <p className="text-xs capitalize"    style={{ color: B.muted }}>{c.tipo}</p>
      </td>

      {/* DNI / RUC */}
      <td className="px-4 py-3 text-sm font-mono" style={{ color: B.charcoal }}>
        {c.dni ?? c.ruc ?? '-'}
      </td>

      {/* Teléfono */}
      <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>
        {c.telefono ?? '-'}
      </td>

      {/* Puntos */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5" style={{ color: B.gold }} />
          <span
            className="text-sm font-bold"
            style={{ color: c.puntos_acumulados > 0 ? B.gold : B.muted }}
          >
            {c.puntos_acumulados.toFixed(1)}
          </span>
        </div>
      </td>

      {/* Fecha */}
      <td className="px-4 py-3 text-xs" style={{ color: B.muted }}>
        {new Date(c.created_at).toLocaleDateString('es-PE')}
      </td>

      {/* Acciones */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEditar(c)}
            className="p-1.5 rounded-lg"
            style={{ color: B.green }}
            onMouseEnter={e => (e.currentTarget.style.background = `${B.green}15`)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEliminar(c.id)}
            className="p-1.5 rounded-lg"
            style={{ color: B.terra }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Desactivar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}