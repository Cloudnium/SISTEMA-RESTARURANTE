// components/shared/AlertaStockModal.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { X, AlertTriangle, Package, TrendingDown, ChevronDown } from 'lucide-react';
import { B } from '@/lib/brand';
import type { Producto } from '@/lib/supabase/types';

interface ItemAlerta {
  id: string;
  nombre: string;
  categoria: string;
  stock: number;
  minimo: number;
}

interface AlertaStockModalProps {
  productos: Producto[];
  open: boolean;
  onClose: () => void;
}

const LIMITE_VISIBLE = 4;

// Determina el par stock/mínimo relevante según el tipo de producto:
// - insumo          -> stock_cocina / stock_minimo_cocina (Almacén)
// - producto_venta  -> stock_tienda / stock_minimo_tienda (Tienda)
// Los productos tipo "material" no tienen mínimo definido en el esquema
// (no existe stock_minimo_general), así que no entran en esta alerta.
// Si prefieres que el modal solo considere insumos de Almacén, basta con
// eliminar el bloque "producto_venta" de abajo.
function resolverStock(p: Producto): { stock: number; minimo: number } | null {
  if (p.tipo === 'insumo') {
    return { stock: p.stock_cocina, minimo: p.stock_minimo_cocina };
  }
  if (p.tipo === 'producto_venta') {
    return { stock: p.stock_tienda, minimo: p.stock_minimo_tienda };
  }
  return null;
}

function ItemCard({ item, tono, label }: { item: ItemAlerta; tono: string; label: string }) {
  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3"
      style={{ background: B.white, border: `1px solid ${tono}40` }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${tono}18` }}
      >
        <AlertTriangle className="w-4 h-4" style={{ color: tono }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: B.charcoal }}>{item.nombre}</p>
        <p className="text-xs truncate" style={{ color: B.muted }}>{item.categoria}</p>
      </div>
      <span
        className="text-[10px] font-black px-2 py-1 rounded-full shrink-0 text-center"
        style={{ background: tono, color: B.white }}
      >
        {label}
      </span>
    </div>
  );
}

function Seccion({
  titulo, subtitulo, items, tono, Icon, label,
}: {
  titulo: string;
  subtitulo: string;
  items: ItemAlerta[];
  tono: string;
  Icon: typeof Package;
  label: (item: ItemAlerta) => string;
}) {
  const [expandido, setExpandido] = useState(false);
  if (items.length === 0) return null;

  const visibles   = expandido ? items : items.slice(0, LIMITE_VISIBLE);
  const restantes  = items.length - visibles.length;

  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color: tono }} />
        <p className="text-sm font-black" style={{ color: B.charcoal }}>
          {titulo} ({items.length})
        </p>
      </div>
      <p className="text-xs mb-3" style={{ color: B.muted }}>{subtitulo}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visibles.map(item => (
          <ItemCard key={item.id} item={item} tono={tono} label={label(item)} />
        ))}
      </div>

      {restantes > 0 && (
        <button
          onClick={() => setExpandido(true)}
          className="flex items-center gap-1 text-xs font-bold mt-3 mx-auto"
          style={{ color: tono }}
        >
          <ChevronDown className="w-3.5 h-3.5" /> +{restantes} más
        </button>
      )}
    </div>
  );
}

/**
 * Modal de alertas de inventario. Se controla 100% desde afuera con `open` /
 * `onClose` — este componente no decide cuándo mostrarse, solo qué mostrar.
 * Ver app/page.tsx para la lógica de "mostrar una vez al iniciar sesión".
 */
export function AlertaStockModal({ productos, open, onClose }: AlertaStockModalProps) {
  const { agotados, bajo } = useMemo(() => {
    const agotados: ItemAlerta[] = [];
    const bajo: ItemAlerta[] = [];

    for (const p of productos) {
      if (!p.activo) continue;
      const res = resolverStock(p);
      if (!res) continue;
      const { stock, minimo } = res;

      const item: ItemAlerta = { id: p.id, nombre: p.nombre, categoria: p.categoria, stock, minimo };
      if (stock <= 0) agotados.push(item);
      else if (minimo > 0 && stock < minimo) bajo.push(item);
    }

    agotados.sort((a, b) => a.nombre.localeCompare(b.nombre));
    bajo.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { agotados, bajo };
  }, [productos]);

  const total = agotados.length + bajo.length;
  if (!open || total === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div
          className="flex items-start justify-between gap-3 px-6 py-5 shrink-0"
          style={{ background: `linear-gradient(135deg, ${B.terra}, ${B.gold})` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: B.white }} />
            </div>
            <div>
              <h2 className="text-base font-black" style={{ color: B.white }}>Alertas de Inventario</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {total} producto{total > 1 ? 's' : ''} requiere{total > 1 ? 'n' : ''} atención
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg shrink-0"
            style={{ color: B.white }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 overflow-y-auto flex-1">
          <Seccion
            titulo="Productos Agotados"
            subtitulo="Sin stock disponible — reposición urgente"
            items={agotados}
            tono={B.terra}
            Icon={Package}
            label={() => 'AGOTADO'}
          />
          <Seccion
            titulo="Stock Bajo"
            subtitulo="Por debajo del mínimo establecido"
            items={bajo}
            tono={B.gold}
            Icon={TrendingDown}
            label={item => `${item.stock} UDS`}
          />
        </div>

        {/* Pie */}
        <div className="px-6 pb-6 pt-2 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold"
            style={{ background: B.charcoal, color: B.cream }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}