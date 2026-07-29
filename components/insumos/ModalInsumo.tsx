// components/insumos/ModalInsumo.tsx
'use client';

import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { B } from '@/lib/brand';
import { crearProducto, actualizarProducto } from '@/lib/supabase/queries';
import { CATEGORIAS_PRODUCTO, CATEGORIA_OTRA } from '@/constants/productos/productosConstants';
import { UNIDADES, FORM_VACIO } from '@/constants/insumos/insumosConstants';
import type { FormState } from '@/utils/insumos/insumosUtils';
import type { Producto } from '@/lib/supabase/types';

export default function ModalInsumo({ insumo, onClose, onSaved }: {
  insumo: Producto | null; onClose: () => void; onSaved: () => void;
}) {
  const [form,      setForm]      = useState<FormState>(insumo
    ? { nombre: insumo.nombre, categoria: insumo.categoria, unidad_medida: insumo.unidad_medida as FormState['unidad_medida'],
        stock_tienda: String(insumo.stock_tienda), stock_minimo_tienda: String(insumo.stock_minimo_tienda),
        precio: String(insumo.precio), costo: String(insumo.costo ?? 0) }
    : FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  // La categoría es texto libre en la BD, pero en el formulario se elige de
  // una lista predefinida. Si el producto (editar) trae una categoría que no
  // está en la lista (dato legado), arrancamos en modo "otra" para no perderla.
  const [modoCategoria, setModoCategoria] = useState<'lista' | 'otra'>(
    insumo && insumo.categoria && !CATEGORIAS_PRODUCTO.includes(insumo.categoria) ? 'otra' : 'lista',
  );

  const inp: React.CSSProperties = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };

  const handleGuardar = async () => {
    if (!form.nombre.trim())    { setError('El nombre es obligatorio'); return; }
    if (!form.categoria.trim()) { setError('La categoría es obligatoria'); return; }
    setGuardando(true); setError('');
    try {
      const payload = {
        nombre: form.nombre.trim(), categoria: form.categoria.trim(),
        tipo: 'producto_venta' as const, unidad_medida: form.unidad_medida,
        stock_tienda: parseInt(form.stock_tienda) || 0,
        stock_minimo_tienda: parseInt(form.stock_minimo_tienda) || 5,
        precio: parseFloat(form.precio) || 0, costo: parseFloat(form.costo) || 0,
        activo: true,
      };
      if (insumo) {
        // Editar: no tocamos stock_cocina / stock_general, solo lo que el form controla
        await actualizarProducto(insumo.id, payload);
      } else {
        await crearProducto({
          ...payload,
          stock_cocina: 0, stock_general: 0, stock_minimo_cocina: 0,
        } as Parameters<typeof crearProducto>[0]);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>{insumo ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Nombre del producto</label>
            <input type="text" value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Queque de chocolate, Torta tres leches..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Categoría</label>
            <select
              value={modoCategoria === 'otra' ? CATEGORIA_OTRA : form.categoria}
              onChange={e => {
                const val = e.target.value;
                if (val === CATEGORIA_OTRA) { setModoCategoria('otra'); setForm(f => ({ ...f, categoria: '' })); }
                else                        { setModoCategoria('lista'); setForm(f => ({ ...f, categoria: val })); }
              }}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
              <option value="" disabled>Selecciona una categoría</option>
              {CATEGORIAS_PRODUCTO.map(c => <option key={c} value={c}>{c}</option>)}
              <option value={CATEGORIA_OTRA}>Otra (escribir manualmente)</option>
            </select>
            {modoCategoria === 'otra' && (
              <input type="text" value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                placeholder="Escribe la categoría"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mt-2" style={inp} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Unidad</label>
              <select value={form.unidad_medida}
                onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value as FormState['unidad_medida'] }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Precio unit. (S/)</label>
              <input type="number" value={form.precio}
                onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                placeholder="0.00" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Stock tienda</label>
              <input type="number" value={form.stock_tienda}
                onChange={e => setForm(f => ({ ...f, stock_tienda: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Stock mínimo</label>
              <input type="number" value={form.stock_minimo_tienda}
                onChange={e => setForm(f => ({ ...f, stock_minimo_tienda: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}>
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            {insumo ? 'Guardar' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  );
}