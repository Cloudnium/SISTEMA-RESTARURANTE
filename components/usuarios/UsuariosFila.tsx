// components/usuarios/UsuariosFila.tsx
'use client';

import { UserCircle, Edit, Trash2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { ROL_CFG } from '@/constants/usuarios/constants';
import type { Usuario } from '@/lib/supabase/types';

interface UsuariosFilaProps {
  usuario:    Usuario;
  onEditar:   (u: Usuario) => void;
  onEliminar: (u: Usuario) => void;
}

export function UsuariosFila({ usuario: u, onEditar, onEliminar }: UsuariosFilaProps) {
  const rolCfg = ROL_CFG[u.rol];

  return (
    <tr
      style={{ borderTop: `1px solid ${B.cream}` }}
      onMouseEnter={e => (e.currentTarget.style.background = `${B.cream}50`)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Nombre + avatar */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: rolCfg.bg }}
          >
            <UserCircle className="w-4 h-4" style={{ color: rolCfg.color }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: B.charcoal }}>
            {u.nombre}
          </span>
        </div>
      </td>

      {/* Email */}
      <td className="px-4 py-3 text-sm" style={{ color: B.muted }}>
        {u.email}
      </td>

      {/* Rol */}
      <td className="px-4 py-3">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: rolCfg.bg, color: rolCfg.color }}
        >
          {rolCfg.label}
        </span>
      </td>

      {/* DNI */}
      <td className="px-4 py-3 text-sm font-mono" style={{ color: B.charcoal }}>
        {u.dni ?? '-'}
      </td>

      {/* Caja */}
      <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>
        {u.caja?.nombre ?? '-'}
      </td>

      {/* Estado */}
      <td className="px-4 py-3">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={
            u.activo
              ? { background: '#e8f5e2', color: B.green }
              : { background: '#fee2e2', color: B.terra }
          }
        >
          {u.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>

      {/* Acciones */}
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button
            onClick={() => onEditar(u)}
            className="p-1.5 rounded-lg"
            style={{ color: B.green }}
            onMouseEnter={e => (e.currentTarget.style.background = `${B.green}15`)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEliminar(u)}
            className="p-1.5 rounded-lg"
            style={{ color: B.terra }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Eliminar / Desactivar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}