// components/almacen/TablaProductos.tsx
'use client';

import { AlertTriangle, Package } from 'lucide-react';
import { B } from '@/lib/brand';
import { ProgressBar } from '@/components/ui';
import type { Producto } from '@/lib/supabase/types';

interface Props {
  items:      Producto[];
  stockKey:   'stock_cocina';
  minimoKey?: 'stock_minimo_cocina';
  color:      string;
  onAjustar:  (p: Producto) => void;
  onEditar?:  (p: Producto) => void;
  accionLabel: string;
  AccionIcon: React.ComponentType<{ className?: string }>;
}

export default function TablaProductos({
  items, stockKey, minimoKey, color, onAjustar, onEditar, accionLabel, AccionIcon,
}: Props) {
  if (items.length === 0) return (
    <div className="py-12 flex flex-col items-center gap-2" style={{ color: B.muted }}>
      <Package className="w-10 h-10 opacity-30" />
      <p className="text-sm">Sin insumos registrados</p>
    </div>
  );

  return (
    <table className="w-full">
      <thead>
        <tr style={{ background: B.cream }}>
          {['Producto', 'Categoría', 'Precio', 'Stock', 'Acción'].map(h => (
            <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
              style={{ color: B.muted, width: h === 'Producto' ? '34%' : undefined }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map(p => {
          const stock  = p[stockKey];
          const minimo = minimoKey ? p[minimoKey] : 0;
          const isLow  = minimoKey ? stock < minimo : false;
          const pct    = minimo > 0
            ? Math.min((stock / (minimo * 3)) * 100, 100)
            : Math.min((stock / 30) * 100, 100);

          return (
            <tr key={p.id} style={{ borderTop: `1px solid ${B.cream}` }}
              onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {isLow && <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: B.terra }} />}
                  <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{p.nombre}</p>
                </div>
                <p className="text-xs" style={{ color: B.muted, paddingLeft: isLow ? '22px' : '0' }}>{p.unidad_medida}</p>
              </td>
              <td className="px-4 py-3">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: B.cream, color: B.charcoal }}>{p.categoria}</span>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>S/ {p.precio.toFixed(2)}</td>
              <td className="px-4 py-3 w-40">
                <div className="flex items-center gap-2 mb-1">
                  <ProgressBar pct={pct} color={isLow ? B.terra : color} height={5} />
                  <span className="text-xs font-bold shrink-0" style={{ color: isLow ? B.terra : B.charcoal }}>{stock}</span>
                </div>
                {minimoKey && minimo > 0 && <p className="text-[10px]" style={{ color: B.muted }}>Mín: {minimo}</p>}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button onClick={() => onAjustar(p)}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg"
                    style={{ background: color, color: B.cream }}>
                    <AccionIcon className="w-3 h-3" /> {accionLabel}
                  </button>
                  {onEditar && (
                    <button onClick={() => onEditar(p)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
                      Editar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}