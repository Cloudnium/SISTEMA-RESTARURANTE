// components/usuarios/UsuariosTabla.tsx
'use client';

import { B } from '@/lib/brand';
import { UsuariosFila } from '@/components/usuarios/UsuariosFila';
import type { Usuario } from '@/lib/supabase/types';

const CABECERAS = ['Usuario', 'Email', 'Rol', 'DNI', 'Caja', 'Estado', 'Acciones'];

interface UsuariosTablaProps {
  usuarios:     Usuario[];
  totalUsuarios: number;
  onEditar:     (u: Usuario) => void;
  onEliminar:   (u: Usuario) => void;
}

export function UsuariosTabla({
  usuarios, totalUsuarios, onEditar, onEliminar,
}: UsuariosTablaProps) {
  const mensajeVacio = totalUsuarios === 0
    ? 'Sin usuarios registrados'
    : 'No hay resultados para los filtros aplicados';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: B.white, border: `1px solid ${B.cream}` }}
    >
      {/* Scroll horizontal en móvil */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-680px">
          <thead>
            <tr style={{ background: B.cream }}>
              {CABECERAS.map(h => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
                  style={{ color: B.muted }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <UsuariosFila
                key={u.id}
                usuario={u}
                onEditar={onEditar}
                onEliminar={onEliminar}
              />
            ))}
          </tbody>
        </table>
      </div>

      {usuarios.length === 0 && (
        <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
          {mensajeVacio}
        </div>
      )}
    </div>
  );
}