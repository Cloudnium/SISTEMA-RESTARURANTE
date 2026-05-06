// components/almacen/InsumosView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, AlertTriangle, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn, ProgressBar } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { crearProducto } from '@/lib/supabase/queries';
import type { Producto } from '@/lib/supabase/types';

// ─── Tipos para el formulario ─────────────────────────────────────────────────
interface FormState {
  nombre: string; categoria: string; unidad_medida: string;
  stock_cocina: string; stock_minimo_cocina: string; costo: string;
}
const FORM_VACIO: FormState = {
  nombre: '', categoria: 'Lácteos', unidad_medida: 'kg',
  stock_cocina: '', stock_minimo_cocina: '', costo: '',
};

const CATS    = ['Lácteos', 'Aceites', 'Frutas', 'Proteínas', 'Harinas', 'Endulzantes', 'Otros'];
const UNIDADES = ['litros', 'kg', 'unidades', 'bolsas', 'cajas'];

// ─── Modal ────────────────────────────────────────────────────────────────────
function NuevoModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form,      setForm]      = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const inputStyle: React.CSSProperties = {
    background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setGuardando(true); setError('');
    try {
      await crearProducto({
        nombre:               form.nombre,
        categoria:            form.categoria,
        categoria_id:         null,
        tipo:                 'insumo',
        precio:               0,
        costo:                parseFloat(form.costo) || null,
        unidad_medida:        form.unidad_medida,
        imagen:               null,
        descripcion:          null,
        codigo_barras:        null,
        stock_tienda:         0,
        stock_cocina:         parseFloat(form.stock_cocina) || 0,
        stock_general:        0,
        stock_minimo_tienda:  0,
        stock_minimo_cocina:  parseFloat(form.stock_minimo_cocina) || 0,
        activo:               true,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.6)' }} onClick={onClose}>
      <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4" style={{ color: B.charcoal }}>Nuevo Insumo</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Nombre</label>
            <input type="text" value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Leche entera"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Categoría</label>
              <select value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Unidad</label>
              <select value={form.unidad_medida}
                onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {([
              ['stock_cocina',         'Stock actual',  '0'],
              ['stock_minimo_cocina',  'Stock mínimo',  '5'],
              ['costo',                'Costo (S/)',     '0.00'],
            ] as const).map(([key, label, ph]) => (
              <div key={key}>
                <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>{label}</label>
                <input type="number" value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={ph}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
            ))}
          </div>
          {error && (
            <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}>
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function InsumosView() {
  const { productos, isLoading, refetchProductos } = useGlobalData();
  const [search,     setSearch]  = useState('');
  const [catFiltro,  setCat]     = useState<string>('Todos');
  const [showModal,  setModal]   = useState(false);

  // Solo insumos de cocina
  const insumos = useMemo(() =>
    productos.filter(p => p.tipo === 'insumo'),
    [productos]
  );

  const bajos = useMemo(() =>
    insumos.filter(p => p.stock_cocina < p.stock_minimo_cocina),
    [insumos]
  );

  const filtered = useMemo(() => {
    return insumos.filter(p =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) &&
      (catFiltro === 'Todos' || p.categoria === catFiltro)
    );
  }, [insumos, search, catFiltro]);

  const valorTotal = insumos.reduce((a, p) => a + p.stock_cocina * (p.costo ?? 0), 0);

  // Categorías únicas desde los datos reales
  const cats = useMemo(() => {
    const set = new Set(insumos.map(p => p.categoria));
    return Array.from(set).sort();
  }, [insumos]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Insumos de Cocina"
        subtitle="Inventario de materia prima e ingredientes"
        action={<Btn onClick={() => setModal(true)}><Plus className="w-4 h-4" />Nuevo Insumo</Btn>}
      />

      {/* Alerta de stock bajo */}
      {bajos.length > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3 mb-5"
          style={{ background: '#fef0e6', border: `1px solid ${B.terra}30` }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: B.terra }} />
          <div>
            <p className="text-sm font-bold" style={{ color: B.terra }}>
              {bajos.length} insumos bajo el mínimo
            </p>
            <p className="text-xs mt-0.5" style={{ color: B.terra }}>
              {bajos.map(i => i.nombre).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Insumos', value: insumos.length,           unit: 'productos',   color: B.charcoal },
          { label: 'Stock Bajo',    value: bajos.length,             unit: 'por reponer', color: B.terra },
          { label: 'Valor Inv.',    value: `S/ ${Math.round(valorTotal)}`, unit: 'estimado', color: B.green },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-widest" style={{ color: B.muted }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: B.muted }}>{s.unit}</p>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar insumo..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['Todos', ...cats] as string[]).map(c => (
            <button key={c} onClick={() => setCat(c)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={catFiltro === c
                ? { background: B.charcoal, color: B.cream }
                : { background: B.white, color: B.charcoal, border: `1px solid ${B.cream}` }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Insumo', 'Categoría', 'Stock / Mín.', 'Costo Unit.', 'Acción'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
                  style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(ins => {
              const low = ins.stock_cocina < ins.stock_minimo_cocina;
              const pct = Math.min((ins.stock_cocina / Math.max(ins.stock_minimo_cocina * 3, 1)) * 100, 100);
              return (
                <tr key={ins.id} style={{ borderTop: `1px solid ${B.cream}` }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {low && <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: B.terra }} />}
                      <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{ins.nombre}</p>
                    </div>
                    <p className="text-xs" style={{ color: B.muted, paddingLeft: low ? '22px' : '0' }}>
                      {ins.unidad_medida}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: B.cream, color: B.charcoal }}>{ins.categoria}</span>
                  </td>
                  <td className="px-4 py-3 w-36">
                    <div className="flex items-center gap-2 mb-1">
                      <ProgressBar pct={pct} color={low ? B.terra : B.green} height={6} />
                      <span className="text-xs font-bold shrink-0"
                        style={{ color: low ? B.terra : B.charcoal }}>{ins.stock_cocina}</span>
                    </div>
                    <p className="text-[10px]" style={{ color: B.muted }}>Mín: {ins.stock_minimo_cocina}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: B.charcoal }}>
                    S/ {(ins.costo ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <Btn color={B.green} textColor={B.cream} small>Abastecer</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
            No se encontraron insumos
          </div>
        )}
      </div>

      {showModal && (
        <NuevoModal
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); refetchProductos(); }}
        />
      )}
    </div>
  );
}