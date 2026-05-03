//componentes/ProduccionView.tsx
'use client';

import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
type TipoProd = 'produccion' | 'porcionado';
type Unidad   = 'porciones' | 'unidades' | 'kg' | 'litros';

interface Produccion {
  id: number;
  producto: string;
  tipo: TipoProd;
  porciones: number;
  unidad: Unidad;
  fecha: string;
  hora: string;
  responsable: string;
  notas: string;
}

interface FormState {
  producto: string;
  tipo: TipoProd;
  porciones: string;
  unidad: Unidad;
  notas: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const PROD_DATA: Produccion[] = [
  { id: 1, producto: 'Keke de Vainilla',    tipo: 'produccion', porciones: 24, unidad: 'porciones', fecha: '02/05/2026', hora: '08:00', responsable: 'Chef Ana',  notas: 'Producción matutina' },
  { id: 2, producto: 'Brownie de Chocolate',tipo: 'produccion', porciones: 36, unidad: 'porciones', fecha: '02/05/2026', hora: '08:30', responsable: 'Chef Ana',  notas: '' },
  { id: 3, producto: 'Cheesecake Fresa',    tipo: 'porcionado', porciones: 12, unidad: 'porciones', fecha: '02/05/2026', hora: '09:00', responsable: 'Chef Luis', notas: 'Para el turno tarde' },
  { id: 4, producto: 'Torta Tres Leches',   tipo: 'produccion', porciones: 16, unidad: 'porciones', fecha: '01/05/2026', hora: '07:30', responsable: 'Chef Ana',  notas: '' },
  { id: 5, producto: 'Galletas de Avena',   tipo: 'porcionado', porciones: 60, unidad: 'unidades',  fecha: '01/05/2026', hora: '09:15', responsable: 'Chef Luis', notas: 'Lote especial' },
];

// ─── Badge ────────────────────────────────────────────────────────────────────
function TipoBadge({ tipo }: { tipo: TipoProd }) {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={
        tipo === 'produccion'
          ? { background: '#e8f5e2', color: B.green }
          : { background: '#fdf8e6', color: B.gold }
      }
    >
      {tipo === 'produccion' ? 'Producción' : 'Porcionado'}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface NuevoModalProps { onClose: () => void; }

function NuevoModal({ onClose }: NuevoModalProps) {
  const [form, setForm] = useState<FormState>({
    producto: '', tipo: 'produccion', porciones: '', unidad: 'porciones', notas: '',
  });

  const inputStyle: React.CSSProperties = {
    background: B.cream,
    border: `1px solid ${B.creamDark}`,
    color: B.charcoal,
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
        <h2 className="text-lg font-bold mb-4" style={{ color: B.charcoal }}>Registrar Producción</h2>

        <div className="space-y-3">
          {/* Tipo */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
              Tipo
            </label>
            <div className="flex gap-2">
              {(['produccion', 'porcionado'] as TipoProd[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                  className="flex-1 py-2 rounded-xl text-sm font-bold"
                  style={
                    form.tipo === t
                      ? { background: B.charcoal, color: B.cream }
                      : { background: B.cream, color: B.charcoal }
                  }
                >
                  {t === 'produccion' ? 'Producción' : 'Porcionado'}
                </button>
              ))}
            </div>
          </div>

          {/* Producto */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
              Nombre del producto
            </label>
            <input
              type="text"
              value={form.producto}
              onChange={(e) => setForm((f) => ({ ...f, producto: e.target.value }))}
              placeholder="Ej: Keke de Vainilla"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>

          {/* Cantidad + Unidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
                Cantidad
              </label>
              <input
                type="number"
                value={form.porciones}
                onChange={(e) => setForm((f) => ({ ...f, porciones: e.target.value }))}
                placeholder="24"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
                Unidad
              </label>
              <select
                value={form.unidad}
                onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value as Unidad }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              >
                {(['porciones', 'unidades', 'kg', 'litros'] as Unidad[]).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
              Notas
            </label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}
          >
            Cancelar
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: B.green, color: B.cream }}
          >
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ProduccionView() {
  const [search, setSearch]     = useState('');
  const [filtro, setFiltro]     = useState<'todos' | TipoProd>('todos');
  const [showModal, setModal]   = useState(false);

  const filtered = PROD_DATA.filter(
    (p) =>
      p.producto.toLowerCase().includes(search.toLowerCase()) &&
      (filtro === 'todos' || p.tipo === filtro),
  );

  const totalPorciones = PROD_DATA.reduce((a, p) => a + p.porciones, 0);

  return (
    <div>
      <PageHeader
        title="Producción de Cocina"
        subtitle="Registro de alimentos producidos y porcionados"
        action={<Btn onClick={() => setModal(true)}><Plus className="w-4 h-4" />Nuevo Registro</Btn>}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Hoy',    value: totalPorciones,                                     unit: 'porciones', color: B.green },
          { label: 'Producciones', value: PROD_DATA.filter((p) => p.tipo === 'produccion').length, unit: 'lotes',     color: B.charcoal },
          { label: 'Porcionados',  value: PROD_DATA.filter((p) => p.tipo === 'porcionado').length, unit: 'lotes',     color: B.gold },
        ].map((s) => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-widest" style={{ color: B.muted }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: B.muted }}>{s.unit}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }}
          />
        </div>
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${B.cream}` }}>
          {(['todos', 'produccion', 'porcionado'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFiltro(k)}
              className="px-3 py-2 text-sm font-medium capitalize"
              style={filtro === k ? { background: B.charcoal, color: B.cream } : { background: B.white, color: B.charcoal }}
            >
              {k === 'todos' ? 'Todos' : k === 'produccion' ? 'Producción' : 'Porcionado'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Producto', 'Tipo', 'Cantidad', 'Fecha / Hora', 'Responsable'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderTop: `1px solid ${B.cream}` }}>
                <td className="px-4 py-3 text-sm font-semibold" style={{ color: B.charcoal }}>{p.producto}</td>
                <td className="px-4 py-3"><TipoBadge tipo={p.tipo} /></td>
                <td className="px-4 py-3">
                  <p className="text-sm font-bold" style={{ color: B.charcoal }}>{p.porciones}</p>
                  <p className="text-xs" style={{ color: B.muted }}>{p.unidad}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm" style={{ color: B.charcoal }}>{p.fecha}</p>
                  <p className="text-xs" style={{ color: B.muted }}>{p.hora}</p>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{p.responsable}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
            No hay registros para mostrar
          </div>
        )}
      </div>

      {showModal && <NuevoModal onClose={() => setModal(false)} />}
    </div>
  );
}