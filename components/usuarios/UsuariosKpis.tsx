// components/usuarios/UsuariosKpis.tsx
'use client';

import { useMemo } from 'react';
import { KpiCard } from '@/components/ui';
import { ROL_CFG, ROL_ICON } from '@/constants/usuarios/constants';
import type { Usuario, RolUsuario } from '@/lib/supabase/types';

interface UsuariosKpisProps {
  usuarios: Usuario[];
}

export function UsuariosKpis({ usuarios }: UsuariosKpisProps) {
  const conteo = useMemo(
    () => ({
      admin:    usuarios.filter(u => u.rol === 'admin').length,
      cajero:   usuarios.filter(u => u.rol === 'cajero').length,
      cocinero: usuarios.filter(u => u.rol === 'cocinero').length,
    }),
    [usuarios],
  );

  return (
    <div className="grid grid-cols-3 gap-4 mb-5">
      {(Object.keys(ROL_CFG) as RolUsuario[]).map(rol => (
        <KpiCard
          key={rol}
          label={ROL_CFG[rol].label}
          value={conteo[rol]}
          icon={ROL_ICON[rol]}
          color={ROL_CFG[rol].color}
        />
      ))}
    </div>
  );
}