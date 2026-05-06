// components/comprobantes/ComprobantesView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Search, Eye, Download, ChevronUp, ChevronDown, Receipt, FileText, DollarSign, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import type { TipoComprobante, EstadoComprobante } from '@/lib/supabase/types';

type SortDir   = 'asc' | 'desc';
type TipoFiltro = 'todos' | TipoComprobante;

const TIPO_CFG: Record<TipoComprobante, { label: string; bg: string; color: string }> = {
  boleta:     { label: 'Boleta',        bg: '#e8f5e2', color: B.green },
  nota_venta: { label: 'Nota de Venta', bg: '#fdf8e6', color: B.gold  },
  factura:    { label: 'Factura',       bg: '#e8f0fb', color: '#4A6FA5' },
};

function TipoBadge({ tipo }: { tipo: TipoComprobante }) {
  const cfg = TIPO_CFG[tipo];
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
}
function EstadoBadge({ estado }: { estado: EstadoComprobante }) {
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={estado === 'emitido' ? { background: '#e8f5e2', color: B.green } : { background: '#fee2e2', color: B.terra }}>{estado}</span>;
}

const POR_PAGINA = 10;

export default function ComprobantesView() {
  const { comprobantes, isLoading } = useGlobalData();
  const [busqueda,  setBusqueda]  = useState('');
  const [tipoFiltro,setTipoFiltro]= useState<TipoFiltro>('todos');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');
  const [pagina,    setPagina]    = useState(1);

  // comprobantes viene de v_comprobantes_detalle (ya tiene campos extendidos)
  type CompDetalle = {
    id: string; numero: string; tipo: TipoComprobante; estado: EstadoComprobante;
    fecha_emision: string; monto: number; metodo_pago: string;
    cliente_nombre: string | null; usuario_nombre: string;
  };

  const lista = (comprobantes as unknown as CompDetalle[]);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return lista.filter(c => {
      const matchQ    = !q || c.numero.toLowerCase().includes(q) || (c.cliente_nombre ?? '').toLowerCase().includes(q) || c.usuario_nombre.toLowerCase().includes(q);
      const matchTipo = tipoFiltro === 'todos' || c.tipo === tipoFiltro;
      return matchQ && matchTipo;
    }).sort((a, b) => sortDir === 'desc'
      ? b.fecha_emision.localeCompare(a.fecha_emision)
      : a.fecha_emision.localeCompare(b.fecha_emision)
    );
  }, [lista, busqueda, tipoFiltro, sortDir]);

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const hoy = new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
  const totalHoy   = lista.filter(c => new Date(c.fecha_emision).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) === hoy && c.estado === 'emitido').reduce((a, c) => a + c.monto, 0);
  const boletasHoy = lista.filter(c => c.tipo === 'boleta'     && new Date(c.fecha_emision).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) === hoy).length;
  const notasHoy   = lista.filter(c => c.tipo === 'nota_venta' && new Date(c.fecha_emision).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) === hoy).length;

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Comprobantes" subtitle={`Gestión de boletas, facturas y notas de venta · Total: ${lista.length}`} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total Emitido Hoy" value={`S/ ${totalHoy.toFixed(2)}`} icon={DollarSign} color={B.green} />
        <KpiCard label="Boletas Hoy"       value={boletasHoy} sub={`Total: ${lista.filter(c=>c.tipo==='boleta').length}`} icon={Receipt}  color={B.terra} />
        <KpiCard label="Notas de Venta"    value={notasHoy}   sub={`Total: ${lista.filter(c=>c.tipo==='nota_venta').length}`} icon={FileText} color={B.gold} />
        <KpiCard label="Facturas"          value={lista.filter(c=>c.tipo==='factura').length} icon={FileText} color={B.charcoal} />
      </div>

      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
            <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
              placeholder="Buscar por número, cliente o usuario..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
          </div>
          <select value={tipoFiltro} onChange={e => { setTipoFiltro(e.target.value as TipoFiltro); setPagina(1); }}
            className="px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}>
            <option value="todos">Todos</option>
            <option value="boleta">Boletas</option>
            <option value="nota_venta">Notas de Venta</option>
            <option value="factura">Facturas</option>
          </select>
        </div>
        {(busqueda || tipoFiltro !== 'todos') && (
          <p className="text-xs mt-3 pt-3 border-t" style={{ borderColor: B.cream, color: B.muted }}>
            Mostrando <strong>{filtrados.length}</strong> de <strong>{lista.length}</strong> comprobantes
          </p>
        )}
      </Card>

      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Número','Tipo','Cliente','Emitido por'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>{h}</th>
              ))}
              <th className="px-4 py-3 text-left">
                <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  className="flex items-center gap-1 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>
                  Fecha y Hora
                  {sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5" style={{ color: B.green }} /> : <ChevronUp className="w-3.5 h-3.5" style={{ color: B.green }} />}
                </button>
              </th>
              {['Monto','Estado','Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginados.map(c => (
              <tr key={c.id} style={{ borderTop: `1px solid ${B.cream}`, opacity: c.estado === 'anulado' ? 0.6 : 1 }}
                onMouseEnter={e => e.currentTarget.style.background = `${B.cream}60`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="px-4 py-3 text-sm font-semibold" style={{ color: B.charcoal }}>{c.numero}</td>
                <td className="px-4 py-3"><TipoBadge tipo={c.tipo} /></td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{c.cliente_nombre ?? 'Cliente General'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{c.usuario_nombre}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: B.muted }}>
                  {new Date(c.fecha_emision).toLocaleString('es-PE', { timeZone: 'America/Lima', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                </td>
                <td className="px-4 py-3 text-sm font-bold" style={{ color: B.charcoal }}>S/ {c.monto?.toFixed(2)}</td>
                <td className="px-4 py-3"><EstadoBadge estado={c.estado} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg" style={{ color: B.green }}
                      onMouseEnter={e => e.currentTarget.style.background = `${B.green}15`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'} title="Ver">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg" style={{ color: B.gold }}
                      onMouseEnter={e => e.currentTarget.style.background = `${B.gold}15`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'} title="Descargar">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {paginados.length === 0 && <div className="py-12 text-center text-sm" style={{ color: B.muted }}>No se encontraron comprobantes</div>}

        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: B.cream }}>
            <p className="text-xs" style={{ color: B.muted }}>Página {pagina} de {totalPaginas}</p>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPaginas, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPagina(p)}
                  className="w-8 h-8 rounded-lg text-xs font-semibold"
                  style={p === pagina ? { background: B.charcoal, color: B.cream } : { background: B.cream, color: B.charcoal }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}