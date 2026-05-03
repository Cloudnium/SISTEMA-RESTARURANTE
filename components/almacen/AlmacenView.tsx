'use client';
 
import React, { useState, useMemo } from 'react';
import {
  Search, X, Package, AlertTriangle, Warehouse, ChefHat,
  ShoppingBag, ArrowRightLeft
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard, ProgressBar } from '@/components/ui';
 
// ─── Shared helpers ───────────────────────────────────────────────────────────
function inputCls(extra = '') {
  return `w-full px-3 py-2.5 rounded-xl text-sm outline-none ${extra}`;
}
const INP: React.CSSProperties = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };
 
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
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: B.cream }}>
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
 
interface ProductoAlm {
  id: string; nombre: string; codigo: string; categoria: string;
  precio: number; tienda: number; cocina: number; general: number;
}
 
const ALM_DEMO: ProductoAlm[] = [
  { id:'1', nombre:'Keke de Vainilla',    codigo:'P01', categoria:'Postres',    precio:8.00,  tienda:24,  cocina:0,   general:0 },
  { id:'2', nombre:'Brownie Chocolate',   codigo:'P02', categoria:'Postres',    precio:7.00,  tienda:18,  cocina:0,   general:0 },
  { id:'3', nombre:'Harina sin preparar', codigo:'I01', categoria:'Harinas',    precio:2.20,  tienda:0,   cocina:25,  general:0 },
  { id:'4', nombre:'Leche entera',        codigo:'I02', categoria:'Lácteos',    precio:3.50,  tienda:0,   cocina:15,  general:0 },
  { id:'5', nombre:'Aceite vegetal',      codigo:'I03', categoria:'Aceites',    precio:6.50,  tienda:0,   cocina:8,   general:0 },
  { id:'6', nombre:'Azúcar blanca',       codigo:'I04', categoria:'Endulzantes',precio:2.00,  tienda:0,   cocina:18,  general:0 },
  { id:'7', nombre:'Servilletas',         codigo:'G01', categoria:'Limpieza',   precio:0.50,  tienda:0,   cocina:0,   general:200 },
  { id:'8', nombre:'Detergente',          codigo:'G02', categoria:'Limpieza',   precio:8.00,  tienda:0,   cocina:0,   general:5 },
  { id:'9', nombre:'Agua San Luis 625ml', codigo:'P03', categoria:'Bebidas',    precio:2.50,  tienda:45,  cocina:0,   general:0 },
  { id:'10',nombre:'Café molido',         codigo:'I05', categoria:'Insumos',    precio:12.00, tienda:0,   cocina:6,   general:0 },
];
 
const TAB_CONFIG: Record<AlmacenTab, { label: string; key: 'tienda'|'cocina'|'general'; icon: React.ReactNode; desc: string; color: string }> = {
  tienda:  { label:'Tienda',           key:'tienda',  icon: <ShoppingBag className="w-4 h-4" />, desc:'Productos terminados para vender', color: B.green },
  cocina:  { label:'Cocina',           key:'cocina',  icon: <ChefHat     className="w-4 h-4" />, desc:'Insumos para preparación',         color: B.terra },
  general: { label:'General',          key:'general', icon: <Warehouse   className="w-4 h-4" />, desc:'Materiales y consumibles',         color: B.gold  },
};
 
export function AlmacenView() {
  const [tab, setTab]           = useState<AlmacenTab>('tienda');
  const [busqueda, setBusqueda] = useState('');
  const [modalMover, setModalMover] = useState<ProductoAlm | null>(null);
 
  const cfg = TAB_CONFIG[tab];
 
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return ALM_DEMO.filter(p =>
      p[cfg.key] > 0 &&
      (p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q))
    );
  }, [tab, busqueda, cfg.key]);
 
  const totalUnidades = filtrados.reduce((a, p) => a + p[cfg.key], 0);
  const valorTotal    = filtrados.reduce((a, p) => a + p[cfg.key] * p.precio, 0);
  const sinStock      = ALM_DEMO.filter(p => p[cfg.key] === 0).length;
 
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
        <KpiCard label="Productos"      value={filtrados.length} icon={Package}    color={cfg.color} />
        <KpiCard label="Total unidades" value={totalUnidades}    icon={Warehouse}  color={cfg.color} />
        <KpiCard label="Sin stock"      value={sinStock}         icon={AlertTriangle} color={B.terra} />
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
              {['Producto','Código','Categoría','Precio','Stock','Acción'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => {
              const stock = p[cfg.key];
              const pct   = Math.min((stock / 30) * 100, 100);
              return (
                <tr key={p.id} style={{ borderTop: `1px solid ${B.cream}` }}
                  onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: B.charcoal }}>{p.nombre}</td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: B.muted }}>{p.codigo}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: B.cream, color: B.charcoal }}>{p.categoria}</span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>S/ {p.precio.toFixed(2)}</td>
                  <td className="px-4 py-3 w-40">
                    <div className="flex items-center gap-2 mb-1">
                      <ProgressBar pct={pct} color={stock < 5 ? B.terra : cfg.color} height={5} />
                      <span className="text-xs font-bold shrink-0" style={{ color: stock < 5 ? B.terra : B.charcoal }}>{stock}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setModalMover(p)}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
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
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>No hay productos en este almacén</div>
        )}
      </div>
 
      {/* Modal mover */}
      {modalMover && (
        <ModalBase title={`Mover stock · ${modalMover.nombre}`} onClose={() => setModalMover(null)}
          actions={<>
            <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: B.cream, color: B.charcoal }} onClick={() => setModalMover(null)}>Cancelar</button>
            <button className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: B.green, color: B.cream }}>Confirmar movimiento</button>
          </>}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {(['tienda','cocina','general'] as AlmacenTab[]).map(t => {
                const c = TAB_CONFIG[t];
                return (
                  <div key={t} className="rounded-xl p-3 text-center" style={{ background: B.cream }}>
                    <p className="text-xs font-bold" style={{ color: c.color }}>{c.label}</p>
                    <p className="text-xl font-black" style={{ color: B.charcoal }}>{modalMover[t]}</p>
                    <p className="text-[10px]" style={{ color: B.muted }}>unidades</p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Desde</label>
                <select className={inputCls()} style={INP}>
                  {(['tienda','cocina','general'] as AlmacenTab[]).map(t => <option key={t} value={t}>{TAB_CONFIG[t].label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Hacia</label>
                <select className={inputCls()} style={INP}>
                  {(['tienda','cocina','general'] as AlmacenTab[]).map(t => <option key={t} value={t}>{TAB_CONFIG[t].label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Cantidad a mover</label>
              <input type="number" placeholder="0" className={inputCls()} style={INP} />
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
}