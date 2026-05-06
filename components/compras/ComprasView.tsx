// componentes/compras/ComprasView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Edit, Trash2, X, TrendingUp, TrendingDown,
  DollarSign, Loader2
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { crearCompra, eliminarCompra } from '@/lib/supabase/queries';
import type { Compra, TipoComprobanteCompra, ZonaAlmacen } from '@/lib/supabase/types';

// ─── Shared helpers ───────────────────────────────────────────────────────────
function inputCls(extra = '') {
  return `w-full px-3 py-2.5 rounded-xl text-sm outline-none ${extra}`;
}
const INP: React.CSSProperties = {
  background: B.cream,
  border: `1px solid ${B.creamDark}`,
  color: B.charcoal,
};

function ModalBase({ title, onClose, children, actions }: {
  title: string; onClose: () => void;
  children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {actions && <div className="px-6 pb-6 flex gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// ─── Formulario de nueva compra ───────────────────────────────────────────────
interface FormCompra {
  proveedor_nombre: string;
  proveedor_doc: string;
  serie: string;
  numero: string;
  tipo_comprobante: TipoComprobanteCompra;
  base_imponible: string;
  igv: string;
  total: string;
  fecha_emision: string;
}

const FORM_VACIO: FormCompra = {
  proveedor_nombre: '',
  proveedor_doc: '',
  serie: '',
  numero: '',
  tipo_comprobante: 'factura',
  base_imponible: '',
  igv: '',
  total: '',
  fecha_emision: new Date().toISOString().split('T')[0],
};

function ModalNuevaCompra({ onClose, onSaved, usuarioId }: {
  onClose: () => void;
  onSaved: () => void;
  usuarioId: string;
}) {
  const [form, setForm] = useState<FormCompra>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Auto-calcula IGV y base cuando cambia el total
  const handleTotalChange = (valor: string) => {
    const total = parseFloat(valor) || 0;
    const base  = parseFloat((total / 1.18).toFixed(2));
    const igv   = parseFloat((total - base).toFixed(2));
    setForm(f => ({ ...f, total: valor, base_imponible: String(base), igv: String(igv) }));
  };

  const handleGuardar = async () => {
    if (!form.proveedor_nombre.trim()) { setError('El proveedor es obligatorio'); return; }
    if (!form.total || parseFloat(form.total) <= 0) { setError('El total debe ser mayor a 0'); return; }
    setGuardando(true); setError('');
    try {
      await crearCompra(
        {
          tipo_comprobante:   form.tipo_comprobante,
          serie:              form.serie   || null,
          numero:             form.numero  || null,
          fecha_emision:      form.fecha_emision,
          fecha_vencimiento:  null,
          proveedor_nombre:   form.proveedor_nombre,
          proveedor_doc:      form.proveedor_doc || null,
          proveedor_tipo_doc: form.proveedor_doc?.length === 11 ? 'ruc' : 'dni',
          base_imponible:     parseFloat(form.base_imponible) || 0,
          igv:                parseFloat(form.igv) || 0,
          total:              parseFloat(form.total) || 0,
          descripcion:        null,
          usuario_id:         usuarioId,
        },
        [] // items: se puede extender después
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalBase title="Nueva Compra" onClose={onClose}
      actions={<>
        <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal }} onClick={onClose}>
          Cancelar
        </button>
        <button onClick={handleGuardar} disabled={guardando}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: B.green, color: B.cream }}>
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          Registrar
        </button>
      </>}>
      <div className="space-y-3">

        {/* Proveedor */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
            Proveedor *
          </label>
          <input type="text" placeholder="SODALES DISTRIBUIDORES S.A.C."
            value={form.proveedor_nombre}
            onChange={e => setForm(f => ({ ...f, proveedor_nombre: e.target.value }))}
            className={inputCls()} style={INP} />
        </div>

        {/* RUC / DNI */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
            RUC / DNI
          </label>
          <input type="text" placeholder="20525474071"
            value={form.proveedor_doc}
            onChange={e => setForm(f => ({ ...f, proveedor_doc: e.target.value }))}
            className={inputCls()} style={INP} />
        </div>

        {/* Tipo comprobante */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
            Tipo comprobante
          </label>
          <select value={form.tipo_comprobante}
            onChange={e => setForm(f => ({ ...f, tipo_comprobante: e.target.value as TipoComprobanteCompra }))}
            className={inputCls()} style={INP}>
            <option value="factura">Factura</option>
            <option value="boleta">Boleta</option>
            <option value="recibo">Recibo</option>
            <option value="nota_venta">Nota de Venta</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Serie y Número */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
              Serie
            </label>
            <input type="text" placeholder="F002"
              value={form.serie}
              onChange={e => setForm(f => ({ ...f, serie: e.target.value }))}
              className={inputCls()} style={INP} />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
              Número
            </label>
            <input type="text" placeholder="486259"
              value={form.numero}
              onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
              className={inputCls()} style={INP} />
          </div>
        </div>

        {/* Fecha */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
            Fecha de emisión
          </label>
          <input type="date" value={form.fecha_emision}
            onChange={e => setForm(f => ({ ...f, fecha_emision: e.target.value }))}
            className={inputCls()} style={INP} />
        </div>

        {/* Total → auto-calcula base e IGV */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
            Total (S/) *
          </label>
          <input type="number" step="0.01" placeholder="36.24"
            value={form.total}
            onChange={e => handleTotalChange(e.target.value)}
            className={inputCls()} style={INP} />
        </div>

        {/* Base imponible e IGV (calculados, editables si se necesita) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
              Base imponible
            </label>
            <input type="number" step="0.01" placeholder="30.71"
              value={form.base_imponible}
              onChange={e => setForm(f => ({ ...f, base_imponible: e.target.value }))}
              className={inputCls()} style={INP} />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
              IGV (18%)
            </label>
            <input type="number" step="0.01" placeholder="5.53"
              value={form.igv}
              onChange={e => setForm(f => ({ ...f, igv: e.target.value }))}
              className={inputCls()} style={INP} />
          </div>
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>
            {error}
          </p>
        )}
      </div>
    </ModalBase>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export function ComprasView() {
  const { compras, isLoading, refetchCompras, usuarioActual, metricas } = useGlobalData();
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoComprobanteCompra>('todos');
  const [modal, setModal] = useState(false);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return compras.filter(c => {
      const comprobante = [c.serie, c.numero].filter(Boolean).join('-');
      const matchQ =
        !q ||
        c.proveedor_nombre.toLowerCase().includes(q) ||
        comprobante.toLowerCase().includes(q) ||
        (c.proveedor_doc ?? '').includes(q);
      const matchTipo = tipoFiltro === 'todos' || c.tipo_comprobante === tipoFiltro;
      return matchQ && matchTipo;
    });
  }, [compras, busqueda, tipoFiltro]);

  const totalRegistrado = compras.reduce((a, c) => a + c.total, 0);
  const promedio        = compras.length > 0 ? totalRegistrado / compras.length : 0;

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta compra?')) return;
    await eliminarCompra(id);
    refetchCompras();
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Compras"
        subtitle={`Registro de comprobantes de compra a proveedores · Total: ${compras.length} comprobantes`}
        action={<Btn onClick={() => setModal(true)}><Plus className="w-4 h-4" />Nueva compra</Btn>}
      />

      {/* Métricas */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
        <KpiCard label="Ventas de Hoy"   value={`S/ ${(metricas?.ventasHoy ?? 0).toFixed(2)}`}    sub="Ingresos"     icon={TrendingUp}   color={B.green} />
        <KpiCard label="Ventas del Mes"  value={`S/ ${(metricas?.ventasHoy ?? 0).toFixed(2)}`}    sub="Ingresos mes" icon={DollarSign}   color={B.green} />
        <KpiCard label="Compras del Mes" value={`S/ ${totalRegistrado.toFixed(2)}`}               sub="Egresos"      icon={TrendingDown} color={B.terra} />
        <KpiCard label="Diferencia Mes"  value={`S/ ${((metricas?.ventasHoy ?? 0) - totalRegistrado).toFixed(2)}`}  icon={DollarSign}   color={B.gold} />
        <div className="rounded-2xl p-4" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: B.muted }}>Total registrado</p>
          <p className="text-lg font-black mt-0.5" style={{ color: B.terra }}>S/ {totalRegistrado.toFixed(2)}</p>
          <p className="text-[10px] mt-1" style={{ color: B.muted }}>
            Promedio: <span style={{ color: B.charcoal, fontWeight: 700 }}>S/ {promedio.toFixed(2)}</span>
          </p>
        </div>
      </div>

      {/* Filtro */}
      <Card className="mb-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por proveedor, RUC, serie o número..."
              className={inputCls('pl-9')} style={INP} />
          </div>
          <select value={tipoFiltro}
            onChange={e => setTipoFiltro(e.target.value as typeof tipoFiltro)}
            className="px-4 py-2.5 rounded-xl text-sm outline-none" style={INP}>
            <option value="todos">Todos</option>
            <option value="factura">Factura</option>
            <option value="boleta">Boleta</option>
            <option value="recibo">Recibo</option>
            <option value="nota_venta">Nota de Venta</option>
          </select>
        </div>
      </Card>

      {/* Tabla */}
      <div className="rounded-2xl overflow-x-auto" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full min-w-700px">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Fecha', 'Comprobante', 'Proveedor', 'RUC/DNI', 'Base Imp.', 'IGV', 'Total', 'Registrado por', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap"
                  style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => {
              const comprobante = [c.serie, c.numero].filter(Boolean).join('-') || '—';
              const fecha = new Date(c.fecha_emision + 'T00:00:00')
                .toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const registradoPor = (c.usuario as { nombre?: string } | undefined)?.nombre ?? '—';

              return (
                <tr key={c.id} style={{ borderTop: `1px solid ${B.cream}` }}
                  onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: B.charcoal }}>{fecha}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-1 capitalize"
                      style={{ background: `${B.green}18`, color: B.green }}>{c.tipo_comprobante}</span>
                    <span className="text-sm font-semibold" style={{ color: B.charcoal }}>{comprobante}</span>
                  </td>
                  <td className="px-4 py-3 text-sm max-w-160px truncate" style={{ color: B.charcoal }}>
                    {c.proveedor_nombre}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: B.charcoal }}>
                    {c.proveedor_doc ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>S/ {c.base_imponible.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>S/ {c.igv.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: B.charcoal }}>S/ {c.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{registradoPor}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-lg" style={{ color: B.green }}
                        onMouseEnter={e => e.currentTarget.style.background = `${B.green}15`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEliminar(c.id)}
                        className="p-1.5 rounded-lg" style={{ color: B.terra }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
            No se encontraron compras
          </div>
        )}
      </div>

      {modal && usuarioActual && (
        <ModalNuevaCompra
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); refetchCompras(); }}
          usuarioId={usuarioActual.id}
        />
      )}
    </div>
  );
}