// components/almacen/modals/ModalProducto.tsx
'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { crearProducto, actualizarProducto } from '@/lib/supabase/queries';
import { CATEGORIAS_INSUMO, CATEGORIA_OTRA } from '@/constants/productos/productosConstants';
import { PROD_VACIO, UNIDADES_MEDIDA, type ProductoForm } from '@/constants/almacen/almacenConstants';
import { INP, inputCls } from '@/utils/almacen/almacenUtils';
import ModalBase from '@/components/almacen/ModalBase';
import type { Producto } from '@/lib/supabase/types';

// Nota: se eliminó el campo "costo unitario" del formulario. La métrica de
// valorización de almacén (y cualquier cálculo de costo) ahora usa `precio`
// como fuente única de verdad. Internamente seguimos escribiendo `costo`
// igual a `precio` al guardar, para no romper la columna en la BD ni a
// otras partes del sistema que puedan leer `producto.costo`.
interface Props {
  producto: Producto | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ModalProducto({ producto, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ProductoForm>(producto ? {
    nombre:               producto.nombre,
    categoria:            producto.categoria,
    precio:               String(producto.precio),
    unidad_medida:        producto.unidad_medida,
    stock_minimo_cocina:  String(producto.stock_minimo_cocina),
    stock_cocina:         String(producto.stock_cocina ?? 0),
  } : PROD_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  // La categoría es texto libre en la BD, pero en el formulario se elige de
  // una lista predefinida. Si el insumo (editar) trae una categoría que no
  // está en la lista (dato legado), arrancamos en modo "otra" para no perderla.
  const [modoCategoria, setModoCategoria] = useState<'lista' | 'otra'>(
    producto && producto.categoria && !CATEGORIAS_INSUMO.includes(producto.categoria) ? 'otra' : 'lista',
  );

  const set = (key: keyof ProductoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre.trim())    { setError('El nombre es obligatorio'); return; }
    if (!form.categoria.trim()) { setError('La categoría es obligatoria'); return; }
    setGuardando(true); setError('');
    try {
      const precioNum = parseFloat(form.precio) || 0;
      const base = {
        nombre:               form.nombre.trim(),
        categoria:            form.categoria.trim(),
        tipo:                 'insumo' as const,
        precio:               precioNum,
        // Se mantiene sincronizado con `precio` para no romper el esquema
        // ni otras vistas que aún lean `costo` directamente de la BD.
        costo:                precioNum,
        unidad_medida:        form.unidad_medida || 'unidades',
        stock_cocina:         parseFloat(form.stock_cocina) || 0,
        stock_minimo_cocina:  parseFloat(form.stock_minimo_cocina) || 0,
        activo:               true,
      };
      if (producto) {
        await actualizarProducto(producto.id, base);
      } else {
        await crearProducto({
          ...base, stock_tienda: 0, stock_minimo_tienda: 0, stock_general: 0,
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
    <ModalBase
      title={producto ? 'Editar Insumo' : 'Nuevo Insumo'}
      subtitle={producto ? undefined : 'Arroz, harina, huevo, gelatina en polvo, etc.'}
      onClose={onClose}
      actions={<>
        <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal }} onClick={onClose}>Cancelar</button>
        <button onClick={handleGuardar} disabled={guardando}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: B.green, color: B.cream }}>
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          {producto ? 'Guardar cambios' : 'Crear insumo'}
        </button>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Nombre del insumo</label>
          <input type="text" value={form.nombre} onChange={set('nombre')}
            placeholder="Ej: Huevo, Gelatina en polvo 100g..." className={inputCls()} style={INP} />
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
            className={inputCls()} style={INP}>
            <option value="" disabled>Selecciona una categoría</option>
            {CATEGORIAS_INSUMO.map(c => <option key={c} value={c}>{c}</option>)}
            <option value={CATEGORIA_OTRA}>Otra (escribir manualmente)</option>
          </select>
          {modoCategoria === 'otra' && (
            <input type="text" value={form.categoria} onChange={set('categoria')}
              placeholder="Escribe la categoría"
              className={inputCls('mt-2')} style={INP} />
          )}
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Precio / costo (S/)</label>
          <input type="number" min="0" step="0.01" value={form.precio} onChange={set('precio')}
            className={inputCls()} style={INP} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Unidad de medida</label>
            <select value={form.unidad_medida} onChange={set('unidad_medida')}
              className={inputCls()} style={INP}>
              {UNIDADES_MEDIDA.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Stock mínimo alerta</label>
            <input type="number" min="0" value={form.stock_minimo_cocina} onChange={set('stock_minimo_cocina')}
              className={inputCls()} style={INP} />
          </div>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
            Stock {producto ? 'actual' : 'inicial'}
          </label>
          <input
            type="number" min="0" step="0.01"
            value={form.stock_cocina} onChange={set('stock_cocina')}
            placeholder="0"
            className={inputCls()} style={INP}
          />
        </div>

        {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
      </div>
    </ModalBase>
  );
}