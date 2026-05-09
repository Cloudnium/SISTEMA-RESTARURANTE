// componentes/compras/ComprasView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Edit, Trash2, X, TrendingUp, TrendingDown,
  DollarSign, Loader2, AlertTriangle,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
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

const TIPOS_COMP: TipoComprobanteCompra[] = ['factura', 'boleta', 'nota_venta', 'recibo', 'otro'];

// ─── Tipos del formulario ─────────────────────────────────────────────────────
interface CompraItem {
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  zona_destino: ZonaAlmacen;
}

interface FormState {
  tipo_comprobante: TipoComprobanteCompra;
  serie:            string;
  numero:           string;
  fecha_emision:    string;
  proveedor_nombre: string;
  proveedor_doc:    string;
  descripcion:      string;
  igv_incluido:     boolean;
  items:            CompraItem[];
}

const HOY = new Date().toISOString().split('T')[0];

const FORM_VACIO: FormState = {
  tipo_comprobante: 'factura',
  serie: '', numero: '', fecha_emision: HOY,
  proveedor_nombre: '', proveedor_doc: '',
  descripcion: '', igv_incluido: true,
  items: [{ descripcion: '', cantidad: '1', precio_unitario: '', zona_destino: 'cocina' }],
};

// ─── Modal base ───────────────────────────────────────────────────────────────
function ModalBase({ title, onClose, children, actions }: {
  title: string; onClose: () => void;
  children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
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

// ─── Modal Nueva / Editar Compra ──────────────────────────────────────────────
function ModalCompra({ onClose, onSaved, compraEditar }: {
  onClose: () => void;
  onSaved: () => void;
  compraEditar?: Compra | null;
}) {
  const { usuario } = useAuth();

  // Si viene compra a editar, pre-rellenar el form con sus datos
  const [form, setForm] = useState<FormState>(() => {
    if (!compraEditar) return FORM_VACIO;
    return {
      tipo_comprobante: compraEditar.tipo_comprobante,
      serie:            compraEditar.serie ?? '',
      numero:           compraEditar.numero ?? '',
      fecha_emision:    compraEditar.fecha_emision,
      proveedor_nombre: compraEditar.proveedor_nombre,
      proveedor_doc:    compraEditar.proveedor_doc ?? '',
      descripcion:      compraEditar.descripcion ?? '',
      igv_incluido:     true,
      items: compraEditar.items?.map(i => ({
        descripcion:     i.descripcion,
        cantidad:        String(i.cantidad),
        precio_unitario: String(i.precio_unitario),
        zona_destino:    i.zona_destino,
      })) ?? [{ descripcion: '', cantidad: '1', precio_unitario: '', zona_destino: 'cocina' }],
    };
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const totalItems = form.items.reduce((a, i) => {
    const sub = parseFloat(i.cantidad || '0') * parseFloat(i.precio_unitario || '0');
    return a + sub;
  }, 0);
  const igv     = form.igv_incluido ? totalItems * 0.18 / 1.18 : totalItems * 0.18;
  const baseImp = form.igv_incluido ? totalItems - igv : totalItems;
  const total   = form.igv_incluido ? totalItems : totalItems + igv;

  const addItem = () => setForm(f => ({
    ...f, items: [...f.items, { descripcion: '', cantidad: '1', precio_unitario: '', zona_destino: 'cocina' }],
  }));

  const removeItem = (idx: number) => setForm(f => ({
    ...f, items: f.items.filter((_, i) => i !== idx),
  }));

  const updateItem = (idx: number, key: keyof CompraItem, value: string) =>
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [key]: value } : item),
    }));

  const handleGuardar = async () => {
    if (!form.proveedor_nombre.trim()) { setError('El proveedor es obligatorio'); return; }
    if (!form.numero.trim()) { setError('El número de comprobante es obligatorio'); return; }
    if (!usuario) return;

    setLoading(true); setError('');
    try {
      await crearCompra(
        {
          tipo_comprobante:   form.tipo_comprobante,
          serie:              form.serie || null,
          numero:             form.numero,
          fecha_emision:      form.fecha_emision,
          fecha_vencimiento:  null,
          proveedor_nombre:   form.proveedor_nombre,
          proveedor_doc:      form.proveedor_doc || null,
          proveedor_tipo_doc: form.proveedor_doc?.length === 11 ? 'ruc' : 'dni',
          base_imponible:     baseImp,
          igv:                igv,
          total:              total,
          descripcion:        form.descripcion || null,
          usuario_id:         usuario.id,
        },
        form.items
          .filter(i => i.descripcion.trim())
          .map(i => ({
            descripcion:     i.descripcion,
            cantidad:        parseInt(i.cantidad) || 1,
            precio_unitario: parseFloat(i.precio_unitario) || 0,
            zona_destino:    i.zona_destino,
          }))
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase
      title={compraEditar ? 'Editar Compra' : 'Nueva Compra'}
      onClose={onClose}
      actions={<>
        <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal }} onClick={onClose}>
          Cancelar
        </button>
        <button onClick={handleGuardar} disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: B.green, color: B.cream }}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {compraEditar ? 'Guardar cambios' : 'Registrar compra'}
        </button>
      </>}>
      <div className="space-y-4">

        {/* Tipo y Fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Tipo</label>
            <select value={form.tipo_comprobante}
              onChange={e => setForm(f => ({ ...f, tipo_comprobante: e.target.value as TipoComprobanteCompra }))}
              className={inputCls()} style={INP}>
              {TIPOS_COMP.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Fecha</label>
            <input type="date" value={form.fecha_emision}
              onChange={e => setForm(f => ({ ...f, fecha_emision: e.target.value }))}
              className={inputCls()} style={INP} />
          </div>
        </div>

        {/* Serie y Número */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Serie</label>
            <input type="text" value={form.serie}
              onChange={e => setForm(f => ({ ...f, serie: e.target.value }))}
              placeholder="F001" className={inputCls()} style={INP} />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Número *</label>
            <input type="text" value={form.numero}
              onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
              placeholder="12345" className={inputCls()} style={INP} />
          </div>
        </div>

        {/* Proveedor */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Proveedor *</label>
            <input type="text" value={form.proveedor_nombre}
              onChange={e => setForm(f => ({ ...f, proveedor_nombre: e.target.value }))}
              placeholder="Distribuidora S.A.C." className={inputCls()} style={INP} />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>RUC / DNI</label>
            <input type="text" value={form.proveedor_doc}
              onChange={e => setForm(f => ({ ...f, proveedor_doc: e.target.value }))}
              placeholder="20525474071" className={inputCls()} style={INP} />
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black uppercase tracking-wide" style={{ color: B.muted }}>
              Items / Productos
            </label>
            <button onClick={addItem}
              className="text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1"
              style={{ background: `${B.green}18`, color: B.green }}>
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          <div className="space-y-2">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input type="text" value={item.descripcion}
                  onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                  placeholder="Descripción del producto"
                  className="col-span-4 px-3 py-2 rounded-xl text-xs outline-none" style={INP} />
                <input type="number" value={item.cantidad}
                  onChange={e => updateItem(idx, 'cantidad', e.target.value)}
                  placeholder="Cant."
                  className="col-span-1 px-2 py-2 rounded-xl text-xs outline-none text-center" style={INP} />
                <input type="number" value={item.precio_unitario}
                  onChange={e => updateItem(idx, 'precio_unitario', e.target.value)}
                  placeholder="Precio"
                  className="col-span-2 px-2 py-2 rounded-xl text-xs outline-none" style={INP} />
                <select value={item.zona_destino}
                  onChange={e => updateItem(idx, 'zona_destino', e.target.value)}
                  className="col-span-3 px-2 py-2 rounded-xl text-xs outline-none" style={INP}>
                  <option value="cocina">Cocina</option>
                  <option value="tienda">Tienda</option>
                  <option value="general">General</option>
                </select>
                <div className="col-span-1 text-xs text-right font-bold" style={{ color: B.charcoal }}>
                  S/{(parseFloat(item.cantidad || '0') * parseFloat(item.precio_unitario || '0')).toFixed(0)}
                </div>
                <button onClick={() => removeItem(idx)} disabled={form.items.length === 1}
                  className="col-span-1 p-1.5 rounded-lg disabled:opacity-30"
                  style={{ color: B.terra }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        <div className="rounded-xl p-4" style={{ background: B.cream }}>
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" id="igv_incluido" checked={form.igv_incluido}
              onChange={e => setForm(f => ({ ...f, igv_incluido: e.target.checked }))} />
            <label htmlFor="igv_incluido" className="text-xs font-semibold" style={{ color: B.charcoal }}>
              IGV incluido en precios
            </label>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between" style={{ color: B.muted }}>
              <span>Base imponible</span><span>S/ {baseImp.toFixed(2)}</span>
            </div>
            <div className="flex justify-between" style={{ color: B.muted }}>
              <span>IGV (18%)</span><span>S/ {igv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-base border-t pt-1"
              style={{ borderColor: B.creamDark, color: B.charcoal }}>
              <span>Total</span>
              <span style={{ color: B.terra }}>S/ {total.toFixed(2)}</span>
            </div>
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
  const { compras, isLoading, refetchCompras, metricas } = useGlobalData();
  const [busqueda,    setBusqueda]    = useState('');
  const [tipoFiltro,  setTipoFiltro]  = useState<'todos' | TipoComprobanteCompra>('todos');
  // null = cerrado, undefined = nueva, Compra = editar
  const [modal,      setModal]       = useState<null | undefined | Compra>(null);
  const [elimError,  setElimError]   = useState('');

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
    if (!confirm('¿Eliminar esta compra? Esta acción no se puede deshacer.')) return;
    setElimError('');
    try {
      await eliminarCompra(id);
      refetchCompras();
    } catch (e) {
      setElimError(e instanceof Error ? e.message : 'Error al eliminar la compra');
    }
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
        subtitle={`Registro de comprobantes de compra · Total: ${compras.length} comprobantes`}
        action={<Btn onClick={() => setModal(undefined)}><Plus className="w-4 h-4" />Nueva compra</Btn>}
      />

      {/* Métricas */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
        <KpiCard label="Ventas de Hoy"   value={`S/ ${(metricas?.ventasHoy ?? 0).toFixed(2)}`}                              sub="Ingresos"     icon={TrendingUp}   color={B.green} />
        <KpiCard label="Ventas del Mes"  value={`S/ ${(metricas?.ventasHoy ?? 0).toFixed(2)}`}                              sub="Ingresos mes" icon={DollarSign}   color={B.green} />
        <KpiCard label="Compras del Mes" value={`S/ ${totalRegistrado.toFixed(2)}`}                                         sub="Egresos"      icon={TrendingDown} color={B.terra} />
        <KpiCard label="Diferencia Mes"  value={`S/ ${((metricas?.ventasHoy ?? 0) - totalRegistrado).toFixed(2)}`}          icon={DollarSign}  color={B.gold} />
        <div className="rounded-2xl p-4" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: B.muted }}>Total registrado</p>
          <p className="text-lg font-black mt-0.5" style={{ color: B.terra }}>S/ {totalRegistrado.toFixed(2)}</p>
          <p className="text-[10px] mt-1" style={{ color: B.muted }}>
            Promedio: <span style={{ color: B.charcoal, fontWeight: 700 }}>S/ {promedio.toFixed(2)}</span>
          </p>
        </div>
      </div>

      {/* Error de eliminación */}
      {elimError && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4"
          style={{ background: '#fef0e6', border: `1px solid ${B.terra}30` }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: B.terra }} />
          <p className="text-sm" style={{ color: B.terra }}>{elimError}</p>
          <button onClick={() => setElimError('')} className="ml-auto p-0.5 rounded" style={{ color: B.terra }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
            {TIPOS_COMP.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
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
              const comprobante   = [c.serie, c.numero].filter(Boolean).join('-') || '—';
              const fecha         = new Date(c.fecha_emision + 'T00:00:00')
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
                      {/* Editar — ahora abre el modal con la compra cargada */}
                      <button onClick={() => setModal(c)}
                        className="p-1.5 rounded-lg" style={{ color: B.green }}
                        onMouseEnter={e => e.currentTarget.style.background = `${B.green}15`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEliminar(c.id)}
                        className="p-1.5 rounded-lg" style={{ color: B.terra }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Eliminar">
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
            {compras.length === 0 ? 'Sin compras registradas' : 'No se encontraron compras'}
          </div>
        )}
      </div>

      {/* Modal nueva / editar (null = cerrado) */}
      {modal !== null && (
        <ModalCompra
          compraEditar={modal as Compra | undefined}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refetchCompras(); }}
        />
      )}
    </div>
  );
}
