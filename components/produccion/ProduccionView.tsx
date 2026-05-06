// components/produccion/ProduccionView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { registrarProduccion } from '@/lib/supabase/queries';
import type { TipoProduccion } from '@/lib/supabase/types';

// ─── Badge ────────────────────────────────────────────────────────────────────
function TipoBadge({ tipo }: { tipo: TipoProduccion }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={tipo === 'produccion'
        ? { background: '#e8f5e2', color: B.green }
        : { background: '#fdf8e6', color: B.gold }}>
      {tipo === 'produccion' ? 'Producción' : 'Porcionado'}
    </span>
  );
}

// ─── Formulario ───────────────────────────────────────────────────────────────
interface FormState {
  producto_id: string; tipo: TipoProduccion;
  cantidad: string; unidad: string; notas: string;
}
const FORM_VACIO: FormState = {
  producto_id: '', tipo: 'produccion', cantidad: '', unidad: 'porciones', notas: '',
};
const UNIDADES = ['porciones', 'unidades', 'kg', 'litros'];

function NuevoModal({ onClose, onSaved, usuarioId }: {
  onClose: () => void; onSaved: () => void; usuarioId: string;
}) {
  const { productos } = useGlobalData();
  const [form,      setForm]      = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  // Productos que se producen en cocina
  const producibles = useMemo(() =>
    productos.filter(p => p.activo),
    [productos]
  );

  const inputStyle: React.CSSProperties = {
    background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
  };

  const handleGuardar = async () => {
    if (!form.producto_id)           { setError('Selecciona un producto'); return; }
    if (!form.cantidad || parseFloat(form.cantidad) <= 0) { setError('La cantidad debe ser mayor a 0'); return; }
    setGuardando(true); setError('');
    try {
      await registrarProduccion(
        form.producto_id,
        form.tipo,
        parseFloat(form.cantidad),
        form.unidad,
        usuarioId,
        form.notas || undefined,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.6)' }} onClick={onClose}>
      <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4" style={{ color: B.charcoal }}>Registrar Producción</h2>
        <div className="space-y-3">

          {/* Tipo */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Tipo</label>
            <div className="flex gap-2">
              {(['produccion', 'porcionado'] as TipoProduccion[]).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  className="flex-1 py-2 rounded-xl text-sm font-bold"
                  style={form.tipo === t
                    ? { background: B.charcoal, color: B.cream }
                    : { background: B.cream, color: B.charcoal }}>
                  {t === 'produccion' ? 'Producción' : 'Porcionado'}
                </button>
              ))}
            </div>
          </div>

          {/* Producto */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
              Producto *
            </label>
            <select value={form.producto_id}
              onChange={e => setForm(f => ({ ...f, producto_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              <option value="">Seleccionar producto...</option>
              {producibles.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Cantidad + Unidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Cantidad</label>
              <input type="number" value={form.cantidad}
                onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                placeholder="24"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Unidad</label>
              <select value={form.unidad}
                onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Notas</label>
            <textarea value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones..." rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={inputStyle} />
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
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function ProduccionView() {
  const { produccionHoy, isLoading, refetchProduccion, usuarioActual } = useGlobalData();
  const [search,    setSearch]  = useState('');
  const [filtro,    setFiltro]  = useState<'todos' | TipoProduccion>('todos');
  const [showModal, setModal]   = useState(false);

  const filtered = useMemo(() => {
    return produccionHoy.filter(p => {
      const nombre = (p.producto as { nombre?: string } | undefined)?.nombre ?? '';
      const matchQ    = nombre.toLowerCase().includes(search.toLowerCase());
      const matchTipo = filtro === 'todos' || p.tipo === filtro;
      return matchQ && matchTipo;
    });
  }, [produccionHoy, search, filtro]);

  const totalPorciones = produccionHoy.reduce((a, p) => a + p.cantidad, 0);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Producción de Cocina"
        subtitle="Registro de alimentos producidos y porcionados"
        action={
          <Btn onClick={() => setModal(true)}>
            <Plus className="w-4 h-4" />Nuevo Registro
          </Btn>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Hoy',    value: totalPorciones,                                                  unit: 'unidades', color: B.green },
          { label: 'Producciones', value: produccionHoy.filter(p => p.tipo === 'produccion').length,       unit: 'lotes',    color: B.charcoal },
          { label: 'Porcionados',  value: produccionHoy.filter(p => p.tipo === 'porcionado').length,       unit: 'lotes',    color: B.gold },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-widest" style={{ color: B.muted }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: B.muted }}>{s.unit}</p>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }} />
        </div>
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${B.cream}` }}>
          {(['todos', 'produccion', 'porcionado'] as const).map(k => (
            <button key={k} onClick={() => setFiltro(k)}
              className="px-3 py-2 text-sm font-medium capitalize"
              style={filtro === k
                ? { background: B.charcoal, color: B.cream }
                : { background: B.white, color: B.charcoal }}>
              {k === 'todos' ? 'Todos' : k === 'produccion' ? 'Producción' : 'Porcionado'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Producto', 'Tipo', 'Cantidad', 'Fecha / Hora', 'Responsable'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
                  style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const nombreProducto  = (p.producto  as { nombre?: string }   | undefined)?.nombre   ?? '—';
              const nombreResponsable = (p.usuario as { nombre?: string }   | undefined)?.nombre   ?? '—';
              const fecha = new Date(p.fecha + 'T00:00:00')
                .toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
              return (
                <tr key={p.id} style={{ borderTop: `1px solid ${B.cream}` }}>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: B.charcoal }}>{nombreProducto}</td>
                  <td className="px-4 py-3"><TipoBadge tipo={p.tipo} /></td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold" style={{ color: B.charcoal }}>{p.cantidad}</p>
                    <p className="text-xs" style={{ color: B.muted }}>{p.unidad}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm" style={{ color: B.charcoal }}>{fecha}</p>
                    <p className="text-xs" style={{ color: B.muted }}>{p.hora}</p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{nombreResponsable}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
            No hay registros para mostrar
          </div>
        )}
      </div>

      {showModal && usuarioActual && (
        <NuevoModal
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); refetchProduccion(); }}
          usuarioId={usuarioActual.id}
        />
      )}
    </div>
  );
}