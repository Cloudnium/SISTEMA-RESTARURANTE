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
import { useAuth } from '@/lib/auth/AuthContext';
import { moverStock } from '@/lib/supabase/queries';
import type { Producto, ZonaAlmacen } from '@/lib/supabase/types';

// ─── Shared helpers ───────────────────────────────────────────────────────────
function inputCls(extra = '') {
  return `w-full px-3 py-2.5 rounded-xl text-sm outline-none ${extra}`;
}
const INP: React.CSSProperties = {
  background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
};

type AlmacenTab = ZonaAlmacen;

interface TabCfg {
  label:     string;
  stockKey:  'stock_tienda' | 'stock_cocina' | 'stock_general';
  minimoKey: 'stock_minimo_tienda' | 'stock_minimo_cocina';
  icon:      React.ReactNode;
  desc:      string;
  color:     string;
}

const TAB_CONFIG: Record<AlmacenTab, TabCfg> = {
  tienda:  {
    label: 'Tienda',  stockKey: 'stock_tienda',  minimoKey: 'stock_minimo_tienda',
    icon: <ShoppingBag className="w-4 h-4" />,
    desc: 'Productos terminados para vender', color: B.green,
  },
  cocina:  {
    label: 'Cocina',  stockKey: 'stock_cocina',  minimoKey: 'stock_minimo_cocina',
    icon: <ChefHat    className="w-4 h-4" />,
    desc: 'Insumos para preparación',         color: B.terra,
  },
  general: {
    label: 'General', stockKey: 'stock_general', minimoKey: 'stock_minimo_tienda',
    icon: <Warehouse  className="w-4 h-4" />,
    desc: 'Materiales y consumibles',         color: B.gold,
  },
};

// ─── Modal base ───────────────────────────────────────────────────────────────
function ModalBase({ title, subtitle, onClose, children, actions }: {
  title: string; subtitle?: string; onClose: () => void;
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
          <div>
            <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>{title}</h2>
            {subtitle && <p className="text-xs" style={{ color: B.muted }}>{subtitle}</p>}
          </div>
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

// ─── Modal mover stock ────────────────────────────────────────────────────────
function ModalMoverStock({ producto, tabActual, onClose, onSaved }: {
  producto:  Producto;
  tabActual: AlmacenTab;
  onClose:   () => void;
  onSaved:   () => void;
}) {
  const { usuario }             = useAuth();
  const [desde,    setDesde]    = useState<AlmacenTab>(tabActual);
  const [hacia,    setHacia]    = useState<AlmacenTab>(tabActual === 'tienda' ? 'cocina' : 'tienda');
  const [cantidad, setCantidad] = useState('');
  const [obs,      setObs]      = useState('');
  const [moviendo, setMoviendo] = useState(false);
  const [error,    setError]    = useState('');

  const stockDisponible = producto[TAB_CONFIG[desde].stockKey];

  const handleConfirmar = async () => {
    if (desde === hacia)          { setError('La zona origen y destino deben ser diferentes'); return; }
    const cant = parseInt(cantidad);
    if (!cant || cant <= 0)       { setError('Ingresa una cantidad válida'); return; }
    if (cant > stockDisponible)   { setError(`Stock insuficiente en ${TAB_CONFIG[desde].label}. Disponible: ${stockDisponible}`); return; }
    if (!usuario) return;

    setMoviendo(true); setError('');
    try {
      await moverStock(producto.id, desde, hacia, cant, usuario.id, obs || undefined);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al mover stock');
    } finally {
      setMoviendo(false);
    }
  };

  return (
    <ModalBase
      title="Mover Stock"
      subtitle={producto.nombre}
      onClose={onClose}
      actions={<>
        <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal }} onClick={onClose}>
          Cancelar
        </button>
        <button onClick={handleConfirmar} disabled={moviendo}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: B.green, color: B.cream }}>
          {moviendo
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <ArrowRightLeft className="w-4 h-4" />
          }
          Confirmar traslado
        </button>
      </>}>
      <div className="space-y-4">

        {/* Stock actual por zona */}
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(TAB_CONFIG) as [AlmacenTab, TabCfg][]).map(([key, c]) => (
            <div key={key} className="rounded-xl p-3 text-center"
              style={{ background: B.cream, border: `1.5px solid ${desde === key ? c.color : 'transparent'}` }}>
              <p className="text-xs font-bold" style={{ color: c.color }}>{c.label}</p>
              <p className="text-xl font-black" style={{ color: B.charcoal }}>{producto[c.stockKey]}</p>
              <p className="text-[10px]" style={{ color: B.muted }}>unidades</p>
            </div>
          ))}
        </div>

        {/* Desde / Hacia */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Desde</label>
            <select value={desde} onChange={e => setDesde(e.target.value as AlmacenTab)}
              className={inputCls()} style={INP}>
              {(Object.entries(TAB_CONFIG) as [AlmacenTab, TabCfg][]).map(([k, c]) => (
                <option key={k} value={k}>{c.label} ({producto[c.stockKey]})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Hacia</label>
            <select value={hacia} onChange={e => setHacia(e.target.value as AlmacenTab)}
              className={inputCls()} style={INP}>
              {(Object.entries(TAB_CONFIG) as [AlmacenTab, TabCfg][]).map(([k, c]) => (
                <option key={k} value={k} disabled={k === desde}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cantidad */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
            Cantidad a mover{' '}
            <span style={{ color: B.muted, fontWeight: 400 }}>(máx. {stockDisponible})</span>
          </label>
          <input type="number" min="1" max={stockDisponible} value={cantidad}
            onChange={e => setCantidad(e.target.value)}
            placeholder="0" autoFocus
            className="w-full px-4 py-3 rounded-xl text-lg font-bold outline-none"
            style={{ ...INP, border: `2px solid ${B.creamDark}` }}
            onFocus={e => e.currentTarget.style.borderColor = B.green}
            onBlur={e => e.currentTarget.style.borderColor = B.creamDark} />
          <p className="text-[10px] mt-1" style={{ color: B.muted }}>
            Disponible en {TAB_CONFIG[desde].label}: <strong>{stockDisponible}</strong> {producto.unidad_medida}
          </p>
        </div>

        {/* Observación */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
            Observación (opcional)
          </label>
          <input type="text" value={obs} onChange={e => setObs(e.target.value)}
            placeholder="Motivo del traslado..."
            className={inputCls()} style={INP} />
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
  const { productos, isLoading, refetchProductos } = useGlobalData();
  const [tab,        setTab]        = useState<AlmacenTab>('tienda');
  const [busqueda,   setBusqueda]   = useState('');
  const [modalMover, setModalMover] = useState<Producto | null>(null);

  const cfg = TAB_CONFIG[tab];

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return productos
      .filter(p => p.activo && p[cfg.stockKey] >= 0)
      .filter(p => !q || p.nombre.toLowerCase().includes(q) || (p.codigo_barras ?? '').toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos, tab, busqueda, cfg.stockKey]);

  const totalUnidades = filtrados.reduce((a, p) => a + p[cfg.stockKey], 0);
  const valorTotal    = filtrados.reduce((a, p) => a + p[cfg.stockKey] * (p.costo ?? p.precio), 0);
  const sinStock      = filtrados.filter(p => p[cfg.stockKey] === 0).length;
  const bajoMinimo    = filtrados.filter(p => {
    if (tab === 'tienda') return p.stock_tienda < p.stock_minimo_tienda;
    if (tab === 'cocina') return p.stock_cocina < p.stock_minimo_cocina;
    return false;
  }).length;

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
        {(Object.entries(TAB_CONFIG) as [AlmacenTab, TabCfg][]).map(([key, c]) => (
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

      {/* Alerta stock bajo */}
      {tab !== 'general' && bajoMinimo > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3 mb-4"
          style={{ background: '#fef0e6', border: `1px solid ${B.terra}30` }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: B.terra }} />
          <div>
            <p className="text-sm font-bold" style={{ color: B.terra }}>
              {bajoMinimo} producto{bajoMinimo > 1 ? 's' : ''} por debajo del stock mínimo
            </p>
            <p className="text-xs mt-0.5" style={{ color: B.terra }}>
              {filtrados
                .filter(p => tab === 'tienda' ? p.stock_tienda < p.stock_minimo_tienda : p.stock_cocina < p.stock_minimo_cocina)
                .map(p => p.nombre)
                .join(', ')}
            </p>
          </div>
        </div>
      )}

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
              const stock  = p[cfg.stockKey];
              const minimo = tab === 'tienda' ? p.stock_minimo_tienda : tab === 'cocina' ? p.stock_minimo_cocina : 0;
              const isLow  = tab !== 'general' && stock < minimo;
              const pct    = minimo > 0
                ? Math.min((stock / (minimo * 3)) * 100, 100)
                : Math.min((stock / 30) * 100, 100);

              return (
                <tr key={p.id} style={{ borderTop: `1px solid ${B.cream}` }}
                  onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isLow && <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: B.terra }} />}
                      <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{p.nombre}</p>
                    </div>
                    <p className="text-xs" style={{ color: B.muted, paddingLeft: isLow ? '22px' : '0' }}>
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
                      <ProgressBar pct={pct} color={isLow ? B.terra : cfg.color} height={5} />
                      <span className="text-xs font-bold shrink-0"
                        style={{ color: isLow ? B.terra : B.charcoal }}>{stock}</span>
                    </div>
                    {tab !== 'general' && minimo > 0 && (
                      <p className="text-[10px]" style={{ color: B.muted }}>Mín: {minimo}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setModalMover(p)}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: cfg.color, color: B.cream }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Mover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <div className="py-12 flex flex-col items-center gap-2" style={{ color: B.muted }}>
            <Package className="w-10 h-10 opacity-30" />
            <p className="text-sm">
              {productos.length === 0
                ? 'Sin productos registrados'
                : `No hay productos en ${cfg.label}`}
            </p>
          </div>
        )}
      </div>

      {modalMover && (
        <ModalMoverStock
          producto={modalMover}
          tabActual={tab}
          onClose={() => setModalMover(null)}
          onSaved={() => { setModalMover(null); refetchProductos(); }}
        />
      )}
    </div>
  );
}