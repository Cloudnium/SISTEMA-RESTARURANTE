// components/insumos/InsumosView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, AlertTriangle, Loader2, X } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn, ProgressBar } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { crearProducto, actualizarProducto } from '@/lib/supabase/queries';
import type { Producto } from '@/lib/supabase/types';

type CatKey = string;
type UnidadKey = 'litros' | 'kg' | 'unidades' | 'bolsas' | 'cajas';
const UNIDADES: UnidadKey[] = ['kg', 'litros', 'unidades', 'bolsas', 'cajas'];

interface FormState {
  nombre: string; categoria: string; unidad_medida: UnidadKey;
  stock_cocina: string; stock_minimo_cocina: string;
  precio: string; costo: string;
}
const FORM_VACIO: FormState = {
  nombre: '', categoria: 'Lácteos', unidad_medida: 'kg',
  stock_cocina: '0', stock_minimo_cocina: '5', precio: '0', costo: '0',
};

function ModalInsumo({ insumo, onClose, onSaved }: {
  insumo: Producto | null; onClose: () => void; onSaved: () => void;
}) {
  const [form,      setForm]      = useState<FormState>(insumo
    ? { nombre: insumo.nombre, categoria: insumo.categoria, unidad_medida: insumo.unidad_medida as UnidadKey,
        stock_cocina: String(insumo.stock_cocina), stock_minimo_cocina: String(insumo.stock_minimo_cocina),
        precio: String(insumo.precio), costo: String(insumo.costo ?? 0) }
    : FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const inp: React.CSSProperties = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setGuardando(true); setError('');
    try {
      const payload = {
        nombre: form.nombre, categoria: form.categoria,
        tipo: 'insumo' as const, unidad_medida: form.unidad_medida,
        stock_cocina: parseInt(form.stock_cocina) || 0,
        stock_minimo_cocina: parseInt(form.stock_minimo_cocina) || 5,
        precio: parseFloat(form.precio) || 0,
        costo: parseFloat(form.costo) || 0,
        stock_tienda: 0, stock_general: 0, stock_minimo_tienda: 0,
        activo: true,
      };
      if (insumo) await actualizarProducto(insumo.id, payload);
      else await crearProducto(payload as Parameters<typeof crearProducto>[0]);
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
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>{insumo ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {[
            { key: 'nombre',   label: 'Nombre del insumo', ph: 'Ej: Leche entera', type: 'text' },
            { key: 'categoria',label: 'Categoría',         ph: 'Ej: Lácteos',      type: 'text' },
          ].map(({ key, label, ph, type }) => (
            <div key={key}>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>{label}</label>
              <input type={type} value={form[key as keyof FormState]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Unidad</label>
              <select value={form.unidad_medida}
                onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value as UnidadKey }))}
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
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Stock cocina</label>
              <input type="number" value={form.stock_cocina}
                onChange={e => setForm(f => ({ ...f, stock_cocina: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Stock mínimo</label>
              <input type="number" value={form.stock_minimo_cocina}
                onChange={e => setForm(f => ({ ...f, stock_minimo_cocina: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          </div>

          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}>
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            {insumo ? 'Guardar' : 'Crear insumo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InsumosView() {
  const { productos, isLoading, refetchProductos } = useGlobalData();
  const [busqueda,  setBusqueda]  = useState('');
  const [catFiltro, setCatFiltro] = useState<CatKey>('Todos');
  const [modal,     setModal]     = useState<{ open: boolean; insumo: Producto | null }>({ open: false, insumo: null });

  const insumos = useMemo(() => productos.filter(p => p.tipo === 'insumo' && p.activo), [productos]);

  const categorias = useMemo(() => {
    const cats = [...new Set(insumos.map(i => i.categoria))].sort();
    return ['Todos', ...cats];
  }, [insumos]);

  const bajos = insumos.filter(i => i.stock_cocina < i.stock_minimo_cocina);

  const filtrados = useMemo(() => insumos.filter(i => {
    const matchQ = i.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchC = catFiltro === 'Todos' || i.categoria === catFiltro;
    return matchQ && matchC;
  }), [insumos, busqueda, catFiltro]);

  const valorTotal = insumos.reduce((a, i) => a + i.stock_cocina * i.precio, 0);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Insumos de Cocina" subtitle="Inventario de materia prima e ingredientes"
        action={<Btn onClick={() => setModal({ open: true, insumo: null })}><Plus className="w-4 h-4" />Nuevo Insumo</Btn>} />

      {bajos.length > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3 mb-5" style={{ background: '#fef0e6', border: `1px solid ${B.terra}30` }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: B.terra }} />
          <div>
            <p className="text-sm font-bold" style={{ color: B.terra }}>{bajos.length} insumos bajo el mínimo</p>
            <p className="text-xs mt-0.5" style={{ color: B.terra }}>{bajos.map(i => i.nombre).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Insumos', value: insumos.length,  unit: 'productos',   color: B.charcoal },
          { label: 'Stock Bajo',    value: bajos.length,    unit: 'por reponer', color: B.terra    },
          { label: 'Valor en Cocina',value: `S/ ${Math.round(valorTotal)}`, unit: 'estimado', color: B.green },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-widest" style={{ color: B.muted }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: B.muted }}>{s.unit}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar insumo..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categorias.map(c => (
            <button key={c} onClick={() => setCatFiltro(c)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={catFiltro === c
                ? { background: B.charcoal, color: B.cream }
                : { background: B.white, color: B.charcoal, border: `1px solid ${B.cream}` }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Insumo','Categoría','Stock cocina / Mín.','Precio unit.','Acción'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(ins => {
              const low = ins.stock_cocina < ins.stock_minimo_cocina;
              const pct = Math.min((ins.stock_cocina / Math.max(ins.stock_minimo_cocina * 3, 1)) * 100, 100);
              return (
                <tr key={ins.id} style={{ borderTop: `1px solid ${B.cream}` }}
                  onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {low && <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: B.terra }} />}
                      <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{ins.nombre}</p>
                    </div>
                    <p className="text-xs ml-5" style={{ color: B.muted }}>{ins.unidad_medida}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: B.cream, color: B.charcoal }}>{ins.categoria}</span>
                  </td>
                  <td className="px-4 py-3 w-44">
                    <div className="flex items-center gap-2 mb-1">
                      <ProgressBar pct={pct} color={low ? B.terra : B.green} height={5} />
                      <span className="text-xs font-bold shrink-0" style={{ color: low ? B.terra : B.charcoal }}>{ins.stock_cocina}</span>
                    </div>
                    <p className="text-[10px]" style={{ color: B.muted }}>Mín: {ins.stock_minimo_cocina}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: B.charcoal }}>S/ {ins.precio.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setModal({ open: true, insumo: ins })}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: B.green, color: B.cream }}>
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
            {insumos.length === 0 ? 'Sin insumos registrados aún' : 'No hay resultados'}
          </div>
        )}
      </div>

      {modal.open && (
        <ModalInsumo insumo={modal.insumo}
          onClose={() => setModal({ open: false, insumo: null })}
          onSaved={() => { setModal({ open: false, insumo: null }); refetchProductos(); }} />
      )}
    </div>
  );
}