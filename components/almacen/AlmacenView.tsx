// components/almacen/AlmacenView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, X, Package, AlertTriangle, Warehouse, ChefHat,
  ShoppingBag, ArrowRightLeft, Loader2
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard, ProgressBar } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { moverStock } from '@/lib/supabase/queries';
import type { Producto, ZonaAlmacen } from '@/lib/supabase/types';

// ─── Shared helpers ───────────────────────────────────────────────────────────
function inputCls(extra = '') {
  return `w-full px-3 py-2.5 rounded-xl text-sm outline-none ${extra}`;
}
const INP: React.CSSProperties = {
  background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
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

type AlmacenTab = 'tienda' | 'cocina' | 'general';

const TAB_CONFIG: Record<AlmacenTab, {
  label: string; key: ZonaAlmacen;
  icon: React.ReactNode; desc: string; color: string;
}> = {
  tienda:  { label: 'Tienda',  key: 'tienda',  icon: <ShoppingBag className="w-4 h-4" />, desc: 'Productos terminados para vender', color: B.green },
  cocina:  { label: 'Cocina',  key: 'cocina',  icon: <ChefHat     className="w-4 h-4" />, desc: 'Insumos para preparación',         color: B.terra },
  general: { label: 'General', key: 'general', icon: <Warehouse   className="w-4 h-4" />, desc: 'Materiales y consumibles',         color: B.gold  },
};

// ─── Modal mover stock ────────────────────────────────────────────────────────
function ModalMoverStock({ producto, onClose, onSaved, usuarioId }: {
  producto: Producto; onClose: () => void;
  onSaved: () => void; usuarioId: string;
}) {
  const [desde,    setDesde]    = useState<ZonaAlmacen>('tienda');
  const [hacia,    setHacia]    = useState<ZonaAlmacen>('cocina');
  const [cantidad, setCantidad] = useState('');
  const [moviendo, setMoviendo] = useState(false);
  const [error,    setError]    = useState('');

  const stockPorZona: Record<ZonaAlmacen, number> = {
    tienda:  producto.stock_tienda,
    cocina:  producto.stock_cocina,
    general: producto.stock_general,
  };

  const handleConfirmar = async () => {
    const cant = parseFloat(cantidad);
    if (!cant || cant <= 0)          { setError('Ingresa una cantidad válida'); return; }
    if (desde === hacia)             { setError('Origen y destino deben ser distintos'); return; }
    if (cant > stockPorZona[desde])  { setError('Stock insuficiente en el origen'); return; }
    setMoviendo(true); setError('');
    try {
      await moverStock(producto.id, desde, hacia, cant, usuarioId);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al mover stock');
    } finally {
      setMoviendo(false);
    }
  };

  return (
    <ModalBase title={`Mover stock · ${producto.nombre}`} onClose={onClose}
      actions={<>
        <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal }} onClick={onClose}>
          Cancelar
        </button>
        <button onClick={handleConfirmar} disabled={moviendo}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: B.green, color: B.cream }}>
          {moviendo && <Loader2 className="w-4 h-4 animate-spin" />}
          Confirmar movimiento
        </button>
      </>}>
      <div className="space-y-4">
        {/* Stock actual por zona */}
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(TAB_CONFIG) as [AlmacenTab, typeof TAB_CONFIG[AlmacenTab]][]).map(([key, c]) => (
            <div key={key} className="rounded-xl p-3 text-center" style={{ background: B.cream }}>
              <p className="text-xs font-bold" style={{ color: c.color }}>{c.label}</p>
              <p className="text-xl font-black" style={{ color: B.charcoal }}>{stockPorZona[key]}</p>
              <p className="text-[10px]" style={{ color: B.muted }}>unidades</p>
            </div>
          ))}
        </div>

        {/* Desde / Hacia */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Desde</label>
            <select value={desde} onChange={e => setDesde(e.target.value as ZonaAlmacen)}
              className={inputCls()} style={INP}>
              {(Object.entries(TAB_CONFIG) as [AlmacenTab, typeof TAB_CONFIG[AlmacenTab]][]).map(([k, c]) => (
                <option key={k} value={k}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Hacia</label>
            <select value={hacia} onChange={e => setHacia(e.target.value as ZonaAlmacen)}
              className={inputCls()} style={INP}>
              {(Object.entries(TAB_CONFIG) as [AlmacenTab, typeof TAB_CONFIG[AlmacenTab]][]).map(([k, c]) => (
                <option key={k} value={k}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cantidad */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
            Cantidad a mover
          </label>
          <input type="number" placeholder="0" value={cantidad}
            onChange={e => setCantidad(e.target.value)}
            className={inputCls()} style={INP} />
          <p className="text-[10px] mt-1" style={{ color: B.muted }}>
            Disponible en {TAB_CONFIG[desde].label}: <strong>{stockPorZona[desde]}</strong> {producto.unidad_medida}
          </p>
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>
        )}
      </div>
    </ModalBase>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export function AlmacenView() {
  const { productos, isLoading, refetchProductos, usuarioActual } = useGlobalData();
  const [tab,        setTab]        = useState<AlmacenTab>('tienda');
  const [busqueda,   setBusqueda]   = useState('');
  const [modalMover, setModalMover] = useState<Producto | null>(null);

  const cfg = TAB_CONFIG[tab];

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return productos.filter(p =>
      p[`stock_${cfg.key}` as 'stock_tienda' | 'stock_cocina' | 'stock_general'] > 0 &&
      (p.nombre.toLowerCase().includes(q) || (p.codigo_barras ?? '').toLowerCase().includes(q))
    );
  }, [productos, tab, busqueda, cfg.key]);

  const stockKey = `stock_${cfg.key}` as 'stock_tienda' | 'stock_cocina' | 'stock_general';
  const minimoKey = `stock_minimo_${cfg.key === 'general' ? 'cocina' : cfg.key}` as 'stock_minimo_tienda' | 'stock_minimo_cocina';

  const totalUnidades = filtrados.reduce((a, p) => a + p[stockKey], 0);
  const valorTotal    = filtrados.reduce((a, p) => a + p[stockKey] * (p.costo ?? p.precio), 0);
  const sinStock      = productos.filter(p => p[stockKey] === 0).length;

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Almacén" subtitle="Gestiona el stock en tienda, cocina y almacén general" />

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(Object.entries(TAB_CONFIG) as [AlmacenTab, typeof TAB_CONFIG[AlmacenTab]][]).map(([key, c]) => (
          <button key={key} onClick={() => { setTab(key); setBusqueda(''); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={tab === key
              ? { background: c.color, color: B.cream, boxShadow: `0 2px 10px ${c.color}40` }
              : { background: B.white, color: B.charcoal, border: `1px solid ${B.cream}` }
            }>
            {c.icon}{c.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Productos"      value={filtrados.length} icon={Package}       color={cfg.color} />
        <KpiCard label="Total unidades" value={totalUnidades}    icon={Warehouse}     color={cfg.color} />
        <KpiCard label="Sin stock"      value={sinStock}         icon={AlertTriangle} color={B.terra}   />
        <div className="rounded-2xl p-4" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: B.muted }}>Valor almacén</p>
          <p className="text-xl font-black mt-0.5" style={{ color: cfg.color }}>S/ {valorTotal.toFixed(2)}</p>
          <p className="text-[10px] mt-0.5" style={{ color: B.muted }}>{cfg.desc}</p>
        </div>
      </div>

      {/* Búsqueda */}
      <Card className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className={inputCls('pl-9')} style={INP} />
        </div>
      </Card>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Producto', 'Categoría', 'Precio', 'Stock', 'Acción'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
                  style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => {
              const stock   = p[stockKey];
              const minimo  = tab !== 'general' ? p[minimoKey] : 5;
              const pct     = Math.min((stock / Math.max(minimo * 3, 1)) * 100, 100);
              const essBajo = stock < minimo;
              return (
                <tr key={p.id} style={{ borderTop: `1px solid ${B.cream}` }}
                  onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {essBajo && <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: B.terra }} />}
                      <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{p.nombre}</p>
                    </div>
                    <p className="text-xs" style={{ color: B.muted, paddingLeft: essBajo ? '22px' : '0' }}>
                      {p.unidad_medida}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: B.cream, color: B.charcoal }}>{p.categoria}</span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>
                    S/ {p.precio.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 w-40">
                    <div className="flex items-center gap-2 mb-1">
                      <ProgressBar pct={pct} color={essBajo ? B.terra : cfg.color} height={5} />
                      <span className="text-xs font-bold shrink-0"
                        style={{ color: essBajo ? B.terra : B.charcoal }}>{stock}</span>
                    </div>
                    {tab !== 'general' && (
                      <p className="text-[10px]" style={{ color: B.muted }}>Mín: {minimo}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setModalMover(p)}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: cfg.color, color: B.cream }}>
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Mover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
            No hay productos en este almacén
          </div>
        )}
      </div>

      {modalMover && usuarioActual && (
        <ModalMoverStock
          producto={modalMover}
          onClose={() => setModalMover(null)}
          onSaved={() => { setModalMover(null); refetchProductos(); }}
          usuarioId={usuarioActual.id}
        />
      )}
    </div>
  );
}