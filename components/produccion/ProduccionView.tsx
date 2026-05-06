// components/produccion/ProduccionView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, Loader2, ChefHat, Scissors } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { registrarProduccion } from '@/lib/supabase/queries';
import type { TipoProduccion, Producto } from '@/lib/supabase/types';

type Unidad = 'porciones' | 'unidades' | 'kg' | 'litros';

interface FormState {
  producto_id: string;
  tipo:        TipoProduccion;
  cantidad:    string;
  unidad:      Unidad;
  notas:       string;
}

const FORM_VACIO: FormState = {
  producto_id: '', tipo: 'produccion', cantidad: '', unidad: 'porciones', notas: '',
};

function ModalProduccion({ onClose, onSaved, productosVenta }: {
  onClose: () => void; onSaved: () => void; productosVenta: Producto[];
}) {
  const { usuario } = useAuth();
  const [form,      setForm]      = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const inp: React.CSSProperties = {
    background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
  };

  const handleGuardar = async () => {
    if (!form.producto_id) { setError('Selecciona un producto'); return; }
    if (!form.cantidad || parseInt(form.cantidad) <= 0) { setError('Ingresa una cantidad válida'); return; }
    if (!usuario) return;

    setGuardando(true); setError('');
    try {
      await registrarProduccion(
        form.producto_id, form.tipo,
        parseInt(form.cantidad), form.unidad,
        usuario.id, form.notas || undefined
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
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Registrar Producción</h2>
        </div>
        <div className="p-6 space-y-4">
          {/* Tipo */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Tipo</label>
            <div className="flex gap-2">
              {([
                { key: 'produccion', label: 'Producción', icon: <ChefHat className="w-4 h-4" /> },
                { key: 'porcionado', label: 'Porcionado', icon: <Scissors className="w-4 h-4" /> },
              ] as { key: TipoProduccion; label: string; icon: React.ReactNode }[]).map(t => (
                <button key={t.key} onClick={() => setForm(f => ({ ...f, tipo: t.key }))}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                  style={form.tipo === t.key
                    ? { background: B.charcoal, color: B.cream }
                    : { background: B.cream, color: B.charcoal }}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Producto */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Producto</label>
            <select value={form.producto_id} onChange={e => setForm(f => ({ ...f, producto_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
              <option value="">-- Selecciona un producto --</option>
              {productosVenta.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Cantidad + Unidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Cantidad</label>
              <input type="number" min="1" value={form.cantidad}
                onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                placeholder="24" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Unidad</label>
              <select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value as Unidad }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
                <option value="porciones">Porciones</option>
                <option value="unidades">Unidades</option>
                <option value="kg">Kilogramos</option>
                <option value="litros">Litros</option>
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Notas</label>
            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones..." rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inp} />
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
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProduccionView() {
  const { produccionHoy, productos, isLoading, refetchProduccion } = useGlobalData();
  const [busqueda, setBusqueda] = useState('');
  const [filtro,   setFiltro]   = useState<'todos' | TipoProduccion>('todos');
  const [modal,    setModal]    = useState(false);

  // Solo productos de venta (los que se producen)
  const productosVenta = useMemo(() =>
    productos.filter(p => p.tipo === 'producto_venta' && p.activo), [productos]);

  const filtrados = useMemo(() => produccionHoy.filter(p => {
    const nombre = p.producto?.nombre ?? '';
    const matchQ = nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchT = filtro === 'todos' || p.tipo === filtro;
    return matchQ && matchT;
  }), [produccionHoy, busqueda, filtro]);

  const totalPorciones = produccionHoy.reduce((a, p) => a + p.cantidad, 0);
  const producciones   = produccionHoy.filter(p => p.tipo === 'produccion').length;
  const porcionados    = produccionHoy.filter(p => p.tipo === 'porcionado').length;

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Producción de Cocina"
        subtitle={`Registro de alimentos producidos y porcionados · ${new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}`}
        action={<Btn onClick={() => setModal(true)}><Plus className="w-4 h-4" />Nuevo Registro</Btn>} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Hoy',    value: totalPorciones, unit: 'unidades producidas', color: B.green },
          { label: 'Producciones', value: producciones,   unit: 'lotes registrados',   color: B.charcoal },
          { label: 'Porcionados',  value: porcionados,    unit: 'lotes porcionados',    color: B.gold },
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
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }} />
        </div>
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${B.cream}` }}>
          {(['todos', 'produccion', 'porcionado'] as const).map(k => (
            <button key={k} onClick={() => setFiltro(k)}
              className="px-3 py-2 text-sm font-medium"
              style={filtro === k ? { background: B.charcoal, color: B.cream } : { background: B.white, color: B.charcoal }}>
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
              {['Producto','Tipo','Cantidad','Hora','Responsable','Notas'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => (
              <tr key={p.id} style={{ borderTop: `1px solid ${B.cream}` }}
                onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="px-4 py-3 text-sm font-semibold" style={{ color: B.charcoal }}>
                  {p.producto?.nombre ?? p.producto_id}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={p.tipo === 'produccion'
                      ? { background: '#e8f5e2', color: B.green }
                      : { background: '#fdf8e6', color: B.gold }}>
                    {p.tipo === 'produccion' ? 'Producción' : 'Porcionado'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-bold" style={{ color: B.charcoal }}>{p.cantidad}</p>
                  <p className="text-xs" style={{ color: B.muted }}>{p.unidad}</p>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: B.muted }}>{p.hora?.slice(0, 5)}</td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{p.usuario?.nombre ?? '-'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: B.muted }}>{p.notas ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
            {produccionHoy.length === 0 ? 'Sin registros de producción hoy' : 'No hay resultados'}
          </div>
        )}
      </div>

      {modal && (
        <ModalProduccion
          productosVenta={productosVenta}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); refetchProduccion(); }}
        />
      )}
    </div>
  );
}