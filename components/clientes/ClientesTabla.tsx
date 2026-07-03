// components/clientes/ClientesTabla.tsx
'use client';

import { B } from '@/lib/brand';
import { ClientesFila } from './ClientesFila';
import type { Cliente } from '@/lib/supabase/types';

const CABECERAS = ['Tipo', 'Nombre', 'DNI / RUC', 'Teléfono', 'Puntos', 'Fecha', 'Acciones'];

interface ClientesTablaProps {
  clientes:   Cliente[];
  onEditar:   (c: Cliente) => void;
  onEliminar: (id: string) => void;
}

export function ClientesTabla({ clientes, onEditar, onEliminar }: ClientesTablaProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: B.white, border: `1px solid ${B.cream}` }}
    >
      {/* Scroll horizontal en móvil */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-640px">
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
            {clientes.map(c => (
              <ClientesFila
                key={c.id}
                cliente={c}
                onEditar={onEditar}
                onEliminar={onEliminar}
              />
            ))}
          </tbody>
        </table>
      </div>

      {clientes.length === 0 && (
        <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
          No se encontraron clientes
        </div>
      )}
    </div>
  );
}