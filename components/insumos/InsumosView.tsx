//componentes/InsumosView.tsx
'use client';

import React, { useState } from 'react';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn, ProgressBar } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
type CatKey = 'Lácteos' | 'Aceites' | 'Frutas' | 'Proteínas' | 'Harinas' | 'Endulzantes' | 'Otros';
type UnidadKey = 'litros' | 'kg' | 'unidades' | 'bolsas' | 'cajas';

interface Insumo {
  id: number;
  nombre: string;
  cat: CatKey;
  unidad: UnidadKey;
  stock: number;
  minimo: number;
  precio: number;
  ultimo: string;
}

interface FormState {
  nombre: string;
  cat: CatKey;
  unidad: UnidadKey;
  stock: string;
  minimo: string;
  precio: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const INSUMOS: Insumo[] = [
  { id: 1,  nombre: 'Leche entera',       cat: 'Lácteos',     unidad: 'litros',   stock: 15, minimo: 10, precio: 3.50, ultimo: '01/05/2026' },
  { id: 2,  nombre: 'Crema de leche',     cat: 'Lácteos',     unidad: 'litros',   stock: 3,  minimo: 5,  precio: 8.00, ultimo: '30/04/2026' },
  { id: 3,  nombre: 'Aceite vegetal',     cat: 'Aceites',     unidad: 'litros',   stock: 8,  minimo: 4,  precio: 6.50, ultimo: '01/05/2026' },
  { id: 4,  nombre: 'Aceite de oliva',    cat: 'Aceites',     unidad: 'litros',   stock: 2,  minimo: 3,  precio: 18.00,ultimo: '28/04/2026' },
  { id: 5,  nombre: 'Naranjas',           cat: 'Frutas',      unidad: 'kg',       stock: 12, minimo: 8,  precio: 2.50, ultimo: '02/05/2026' },
  { id: 6,  nombre: 'Fresas',             cat: 'Frutas',      unidad: 'kg',       stock: 1,  minimo: 3,  precio: 7.00, ultimo: '01/05/2026' },
  { id: 7,  nombre: 'Pollo entero',       cat: 'Proteínas',   unidad: 'kg',       stock: 20, minimo: 10, precio: 9.50, ultimo: '02/05/2026' },
  { id: 8,  nombre: 'Harina sin preparar',cat: 'Harinas',     unidad: 'kg',       stock: 25, minimo: 15, precio: 2.20, ultimo: '01/05/2026' },
  { id: 9,  nombre: 'Harina preparada',   cat: 'Harinas',     unidad: 'kg',       stock: 4,  minimo: 10, precio: 2.80, ultimo: '29/04/2026' },
  { id: 10, nombre: 'Azúcar blanca',      cat: 'Endulzantes', unidad: 'kg',       stock: 18, minimo: 10, precio: 2.00, ultimo: '01/05/2026' },
  { id: 11, nombre: 'Miel de abeja',      cat: 'Endulzantes', unidad: 'kg',       stock: 2,  minimo: 2,  precio: 15.00,ultimo: '28/04/2026' },
  { id: 12, nombre: 'Cacao en polvo',     cat: 'Otros',       unidad: 'kg',       stock: 3,  minimo: 2,  precio: 12.00,ultimo: '30/04/2026' },
];

const CATS: CatKey[] = ['Lácteos', 'Aceites', 'Frutas', 'Proteínas', 'Harinas', 'Endulzantes', 'Otros'];
const UNIDADES: UnidadKey[] = ['litros', 'kg', 'unidades', 'bolsas', 'cajas'];

// ─── Modal ────────────────────────────────────────────────────────────────────
function NuevoModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<FormState>({
    nombre: '', cat: 'Lácteos', unidad: 'kg', stock: '', minimo: '', precio: '',
  });

  const inputStyle: React.CSSProperties = {
    background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md shadow-2xl"
        style={{ background: B.white }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: B.charcoal }}>Nuevo Insumo</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Nombre</label>
            <input type="text" value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Leche entera"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Categoría</label>
              <select value={form.cat}
                onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value as CatKey }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Unidad</label>
              <select value={form.unidad}
                onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value as UnidadKey }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {([['stock','Stock actual','0'],['minimo','Stock mínimo','5'],['precio','Precio (S/)','0.00']] as const).map(([key,label,ph]) => (
              <div key={key}>
                <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>{label}</label>
                <input type="number" value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={ph}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: B.green, color: B.cream }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function InsumosView() {
  const [search, setSearch]   = useState('');
  const [catFiltro, setCat]   = useState<CatKey | 'Todos'>('Todos');
  const [showModal, setModal] = useState(false);

  const bajos    = INSUMOS.filter((i) => i.stock < i.minimo);
  const filtered = INSUMOS.filter(
    (i) =>
      i.nombre.toLowerCase().includes(search.toLowerCase()) &&
      (catFiltro === 'Todos' || i.cat === catFiltro),
  );
  const valorTotal = INSUMOS.reduce((a, i) => a + i.stock * i.precio, 0);

  return (
    <div>
      <PageHeader
        title="Insumos de Cocina"
        subtitle="Inventario de materia prima e ingredientes"
        action={<Btn onClick={() => setModal(true)}><Plus className="w-4 h-4" />Nuevo Insumo</Btn>}
      />

      {/* Alert */}
      {bajos.length > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3 mb-5" style={{ background: '#fef0e6', border: `1px solid ${B.terra}30` }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: B.terra }} />
          <div>
            <p className="text-sm font-bold" style={{ color: B.terra }}>{bajos.length} insumos bajo el mínimo</p>
            <p className="text-xs mt-0.5" style={{ color: B.terra }}>{bajos.map((i) => i.nombre).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Insumos', value: INSUMOS.length,        unit: 'productos',  color: B.charcoal },
          { label: 'Stock Bajo',    value: bajos.length,          unit: 'por reponer', color: B.terra },
          { label: 'Valor Inv.',    value: `S/ ${Math.round(valorTotal)}`, unit: 'estimado',  color: B.green },
        ].map((s) => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-widest" style={{ color: B.muted }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: B.muted }}>{s.unit}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar insumo..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['Todos', ...CATS] as (CatKey | 'Todos')[]).map((c) => (
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

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Insumo', 'Categoría', 'Stock / Mín.', 'Precio Unit.', 'Último ingreso', 'Acción'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ins) => {
              const low = ins.stock < ins.minimo;
              const pct = Math.min((ins.stock / (ins.minimo * 3)) * 100, 100);
              return (
                <tr key={ins.id} style={{ borderTop: `1px solid ${B.cream}` }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {low && <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: B.terra }} />}
                      <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{ins.nombre}</p>
                    </div>
                    <p className="text-xs" style={{ color: B.muted, paddingLeft: low ? '22px' : '0' }}>{ins.unidad}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: B.cream, color: B.charcoal }}>{ins.cat}</span>
                  </td>
                  <td className="px-4 py-3 w-36">
                    <div className="flex items-center gap-2 mb-1">
                      <ProgressBar pct={pct} color={low ? B.terra : B.green} height={6} />
                      <span className="text-xs font-bold shrink-0" style={{ color: low ? B.terra : B.charcoal }}>{ins.stock}</span>
                    </div>
                    <p className="text-[10px]" style={{ color: B.muted }}>Mín: {ins.minimo}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: B.charcoal }}>S/ {ins.precio.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: B.muted }}>{ins.ultimo}</td>
                  <td className="px-4 py-3">
                    <Btn color={B.green} textColor={B.cream} small>Abastecer</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && <NuevoModal onClose={() => setModal(false)} />}
    </div>
  );
}