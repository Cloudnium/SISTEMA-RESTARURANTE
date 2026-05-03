'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Edit, Trash2, X, TrendingUp, TrendingDown,
  DollarSign
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard, Btn } from '@/components/ui';
 
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
 
// ════════════════════════════════════════════════════════════════════════════
// COMPRAS
// ════════════════════════════════════════════════════════════════════════════
interface Compra {
  id: string; fecha: string; comprobante: string; tipo: string;
  proveedor: string; ruc: string; baseImp: number; igv: number;
  total: number; registradoPor: string;
}
 
const COMPRAS_DEMO: Compra[] = [
  { id:'1', fecha:'30/04/2026', comprobante:'FP15-94229',  tipo:'Factura', proveedor:'COMERCIALIZADORA SALEM...', ruc:'20504208843', baseImp:74.31,   igv:13.38,  total:87.69,   registradoPor:'Sandy' },
  { id:'2', fecha:'29/04/2026', comprobante:'F002-486259', tipo:'Factura', proveedor:'SODALES DISTRIBUIDORES...', ruc:'20525474071', baseImp:30.71,   igv:5.53,   total:36.24,   registradoPor:'Sandy' },
  { id:'3', fecha:'28/04/2026', comprobante:'F666-2053287',tipo:'Factura', proveedor:'EMPRESA COMERCIALIZAD...', ruc:'20557079441', baseImp:801.32,  igv:144.24, total:945.56,  registradoPor:'Sandy' },
  { id:'4', fecha:'27/04/2026', comprobante:'F001-1901',   tipo:'Factura', proveedor:'CYBER CIX',                ruc:'10408902008', baseImp:1497.88, igv:269.62, total:1767.50, registradoPor:'Sandy' },
  { id:'5', fecha:'25/04/2026', comprobante:'EA01-13024',  tipo:'Factura', proveedor:'PUNTO BLANCO SAP',         ruc:'20105367407', baseImp:135.10,  igv:24.32,  total:159.42,  registradoPor:'Caro' },
];
 
export function ComprasView() {
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal]       = useState(false);
 
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return !q ? COMPRAS_DEMO : COMPRAS_DEMO.filter(c =>
      c.proveedor.toLowerCase().includes(q) || c.comprobante.toLowerCase().includes(q) || c.ruc.includes(q)
    );
  }, [busqueda]);
 
  const totalRegistrado = COMPRAS_DEMO.reduce((a, c) => a + c.total, 0);
  const promedio        = totalRegistrado / COMPRAS_DEMO.length;
 
  return (
    <div>
      <PageHeader
        title="Compras"
        subtitle={`Registro de comprobantes de compra a proveedores · Total: ${COMPRAS_DEMO.length} comprobantes`}
        action={<Btn onClick={() => setModal(true)}><Plus className="w-4 h-4" />Nueva compra</Btn>}
      />
 
      {/* Métricas */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
        <KpiCard label="Ventas de Hoy"    value="S/ 887.50" sub="Ingresos"   icon={TrendingUp}   color={B.green} />
        <KpiCard label="Ventas del Mes"   value="S/ 887.50" sub="Ingresos mes" icon={DollarSign} color={B.green} />
        <KpiCard label="Compras del Mes"  value="S/ 0.00"   sub="Egresos"    icon={TrendingDown} color={B.terra} />
        <KpiCard label="Diferencia Mes"   value="+S/ 887.50"                  icon={DollarSign}  color={B.gold} />
        <div className="rounded-2xl p-4" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: B.muted }}>Total registrado</p>
          <p className="text-lg font-black mt-0.5" style={{ color: B.terra }}>S/ {totalRegistrado.toFixed(2)}</p>
          <p className="text-[10px] mt-1" style={{ color: B.muted }}>Promedio: <span style={{ color: B.charcoal, fontWeight: 700 }}>S/ {promedio.toFixed(2)}</span></p>
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
          <select className="px-4 py-2.5 rounded-xl text-sm outline-none" style={INP}>
            <option>Todos</option><option>Factura</option><option>Boleta</option>
          </select>
        </div>
      </Card>
 
      {/* Tabla */}
      <div className="rounded-2xl overflow-x-auto" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full min-w-700px">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Fecha','Comprobante','Proveedor','RUC/DNI','Base Imp.','IGV','Total','Registrado por','Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap" style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr key={c.id} style={{ borderTop: `1px solid ${B.cream}` }}
                onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: B.charcoal }}>{c.fecha}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-1" style={{ background: `${B.green}18`, color: B.green }}>{c.tipo}</span>
                  <span className="text-sm font-semibold" style={{ color: B.charcoal }}>{c.comprobante}</span>
                </td>
                <td className="px-4 py-3 text-sm max-w-160px truncate" style={{ color: B.charcoal }}>{c.proveedor}</td>
                <td className="px-4 py-3 text-sm font-mono" style={{ color: B.charcoal }}>{c.ruc}</td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>S/ {c.baseImp.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>S/ {c.igv.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm font-bold" style={{ color: B.charcoal }}>S/ {c.total.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{c.registradoPor}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg" style={{ color: B.green }}
                      onMouseEnter={e => e.currentTarget.style.background = `${B.green}15`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg" style={{ color: B.terra }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
 
      {modal && (
        <ModalBase title="Nueva Compra" onClose={() => setModal(false)}
          actions={<>
            <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: B.cream, color: B.charcoal }} onClick={() => setModal(false)}>Cancelar</button>
            <button className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: B.green, color: B.cream }}>Registrar</button>
          </>}>
          <div className="space-y-3">
            {[['Proveedor','SODALES DISTRIBUIDORES...'],['RUC / DNI','20525474071'],['N° Comprobante','F002-486259'],['Total (S/)','36.24']].map(([label, ph]) => (
              <div key={label}>
                <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>{label}</label>
                <input type="text" placeholder={ph} className={inputCls()} style={INP} />
              </div>
            ))}
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Tipo comprobante</label>
              <select className={inputCls()} style={INP}>
                <option>Factura</option><option>Boleta</option><option>Recibo</option>
              </select>
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
}