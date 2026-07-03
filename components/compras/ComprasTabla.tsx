// components/compras/components/ComprasTabla.tsx
'use client';

import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { B } from '@/lib/brand';
import type { Compra } from '@/lib/supabase/types';

interface ComprasTablaProps {
  compras:       Compra[];
  totalCount:    number;
  onEditar:      (c: Compra) => void;
  onEliminar:    (id: string) => void;
}

const HEADERS = [
  'Fecha', 'Comprobante', 'Proveedor', 'RUC/DNI',
  'Base Imp.', 'IGV', 'Total', 'Registrado por', 'Acciones',
];

export function ComprasTabla({
  compras,
  totalCount,
  onEditar,
  onEliminar,
}: ComprasTablaProps) {
  return (
    <div
      className="rounded-2xl overflow-x-auto"
      style={{ background: B.white, border: `1px solid ${B.cream}` }}
    >
      <table className="w-full" style={{ minWidth: 700 }}>
        <thead>
          <tr style={{ background: B.cream }}>
            {HEADERS.map(h => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap"
                style={{ color: B.muted }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compras.map(c => (
            <ComprasTablaFila
              key={c.id}
              compra={c}
              onEditar={onEditar}
              onEliminar={onEliminar}
            />
          ))}
        </tbody>
      </table>

      {compras.length === 0 && (
        <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
          {totalCount === 0
            ? 'Sin compras registradas'
            : 'No se encontraron compras'}
        </div>
      )}
    </div>
  );
}

// ─── Fila individual ──────────────────────────────────────────────────────────
interface FilaProps {
  compra:     Compra;
  onEditar:   (c: Compra) => void;
  onEliminar: (id: string) => void;
}

function ComprasTablaFila({ compra: c, onEditar, onEliminar }: FilaProps) {
  const comprobante   = [c.serie, c.numero].filter(Boolean).join('-') || '—';
  const fecha         = new Date(c.fecha_emision + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const registradoPor = (c.usuario as { nombre?: string } | undefined)?.nombre ?? '—';

  return (
    <tr
      style={{ borderTop: `1px solid ${B.cream}` }}
      onMouseEnter={e => (e.currentTarget.style.background = `${B.cream}50`)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: B.charcoal }}>
        {fecha}
      </td>
      <td className="px-4 py-3">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-1 capitalize"
          style={{ background: `${B.green}18`, color: B.green }}
        >
          {c.tipo_comprobante}
        </span>
        <span className="text-sm font-semibold" style={{ color: B.charcoal }}>
          {comprobante}
        </span>
      </td>
      <td
        className="px-4 py-3 text-sm truncate"
        style={{ color: B.charcoal, maxWidth: 160 }}
      >
        {c.proveedor_nombre}
      </td>
      <td className="px-4 py-3 text-sm font-mono" style={{ color: B.charcoal }}>
        {c.proveedor_doc ?? '—'}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>
        S/ {c.base_imponible.toFixed(2)}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>
        S/ {c.igv.toFixed(2)}
      </td>
      <td className="px-4 py-3 text-sm font-bold" style={{ color: B.charcoal }}>
        S/ {c.total.toFixed(2)}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>
        {registradoPor}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button
            onClick={() => onEditar(c)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: B.green }}
            onMouseEnter={e => (e.currentTarget.style.background = `${B.green}15`)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEliminar(c.id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: B.terra }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}