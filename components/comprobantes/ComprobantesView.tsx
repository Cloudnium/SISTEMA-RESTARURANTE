'use client';

import React, { useState, useMemo } from 'react';
import { Search, Eye, Download, ChevronUp, ChevronDown, Receipt, FileText, DollarSign } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
type TipoComp  = 'boleta' | 'nota_venta' | 'factura';
type EstadoComp = 'emitido' | 'anulado';
type SortDir   = 'asc' | 'desc';
type TipoFiltro = 'todos' | TipoComp;

interface Comprobante {
  id: string;
  numero: string;
  tipo: TipoComp;
  cliente: string;
  emitidoPor: string;
  fecha: string;
  monto: number;
  estado: EstadoComp;
  metodoPago: string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO: Comprobante[] = [
  { id:'1', numero:'NV01-00002879', tipo:'nota_venta', cliente:'Cliente General', emitidoPor:'Chef Ana',  fecha:'03/05/2026, 07:29 p.m.', monto:8.00,  estado:'emitido', metodoPago:'efectivo' },
  { id:'2', numero:'NV01-00002878', tipo:'nota_venta', cliente:'Cliente General', emitidoPor:'Chef Ana',  fecha:'03/05/2026, 06:55 p.m.', monto:24.00, estado:'emitido', metodoPago:'yape' },
  { id:'3', numero:'B001-00000012', tipo:'boleta',     cliente:'Juan Pérez',     emitidoPor:'Luis R.',   fecha:'03/05/2026, 06:12 p.m.', monto:45.50, estado:'emitido', metodoPago:'tarjeta' },
  { id:'4', numero:'NV01-00002877', tipo:'nota_venta', cliente:'Cliente General', emitidoPor:'Chef Ana',  fecha:'03/05/2026, 05:48 p.m.', monto:15.00, estado:'anulado', metodoPago:'efectivo' },
  { id:'5', numero:'B001-00000011', tipo:'boleta',     cliente:'María García',   emitidoPor:'Luis R.',   fecha:'02/05/2026, 08:20 p.m.', monto:32.00, estado:'emitido', metodoPago:'efectivo' },
  { id:'6', numero:'F001-00000003', tipo:'factura',    cliente:'EMPRESA GENERAL',emitidoPor:'Admin',     fecha:'02/05/2026, 06:00 p.m.', monto:128.00,estado:'emitido', metodoPago:'transferencia' },
  { id:'7', numero:'NV01-00002876', tipo:'nota_venta', cliente:'Cliente General', emitidoPor:'Chef Ana',  fecha:'02/05/2026, 04:15 p.m.', monto:9.00,  estado:'emitido', metodoPago:'yape' },
  { id:'8', numero:'B001-00000010', tipo:'boleta',     cliente:'Carlos Llanos',  emitidoPor:'Luis R.',   fecha:'01/05/2026, 07:30 p.m.', monto:22.50, estado:'emitido', metodoPago:'efectivo' },
];

const POR_PAGINA = 7;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TIPO_CONFIG: Record<TipoComp, { label: string; bg: string; color: string }> = {
  boleta:     { label: 'Boleta',       bg: '#e8f5e2', color: '#5C7A3E' },
  nota_venta: { label: 'Nota de Venta',bg: '#fdf8e6', color: '#C9A84C' },
  factura:    { label: 'Factura',      bg: '#e8f0fb', color: '#4A6FA5' },
};

function TipoBadge({ tipo }: { tipo: TipoComp }) {
  const cfg = TIPO_CONFIG[tipo];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: EstadoComp }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={estado === 'emitido'
        ? { background: '#e8f5e2', color: B.green }
        : { background: '#fee2e2', color: B.terra }}>
      {estado}
    </span>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ComprobantesView() {
  const [busqueda, setBusqueda]     = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos');
  const [sortDir, setSortDir]       = useState<SortDir>('desc');
  const [pagina, setPagina]         = useState(1);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return DEMO.filter(c => {
      const matchQ    = !q || c.numero.toLowerCase().includes(q) || c.cliente.toLowerCase().includes(q) || c.emitidoPor.toLowerCase().includes(q);
      const matchTipo = tipoFiltro === 'todos' || c.tipo === tipoFiltro;
      return matchQ && matchTipo;
    }).sort((a, b) => sortDir === 'desc' ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha));
  }, [busqueda, tipoFiltro, sortDir]);

  const totalPaginas  = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados     = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const totalHoy      = DEMO.filter(c => c.fecha.startsWith('03/05/2026') && c.estado === 'emitido').reduce((a, c) => a + c.monto, 0);
  const boletasHoy    = DEMO.filter(c => c.tipo === 'boleta' && c.fecha.startsWith('03/05/2026')).length;
  const notasHoy      = DEMO.filter(c => c.tipo === 'nota_venta' && c.fecha.startsWith('03/05/2026')).length;
  const totalBoletas  = DEMO.filter(c => c.tipo === 'boleta').length;
  const totalNotas    = DEMO.filter(c => c.tipo === 'nota_venta').length;

  return (
    <div>
      <PageHeader
        title="Comprobantes"
        subtitle={`Gestión de boletas, facturas y notas de venta · Total: ${DEMO.length}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total Emitido Hoy" value={`S/ ${totalHoy.toFixed(2)}`} icon={DollarSign} color={B.green} />
        <KpiCard label="Boletas Emitidas"  value={boletasHoy}  sub={`Total: ${totalBoletas}`}  icon={Receipt}   color={B.terra} />
        <KpiCard label="Notas de Venta"    value={notasHoy}    sub={`Total: ${totalNotas}`}    icon={FileText}  color={B.gold} />
        <KpiCard label="Facturas"          value={DEMO.filter(c=>c.tipo==='factura').length}    icon={FileText}  color={B.charcoal} />
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
              placeholder="Buscar por número, cliente o usuario..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
            />
          </div>
          <select
            value={tipoFiltro}
            onChange={e => { setTipoFiltro(e.target.value as TipoFiltro); setPagina(1); }}
            className="px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
          >
            <option value="todos">Todos</option>
            <option value="boleta">Boletas</option>
            <option value="nota_venta">Notas de Venta</option>
            <option value="factura">Facturas</option>
          </select>
        </div>
        {(busqueda || tipoFiltro !== 'todos') && (
          <p className="text-xs mt-3 pt-3 border-t" style={{ borderColor: B.cream, color: B.muted }}>
            Mostrando <strong>{filtrados.length}</strong> de <strong>{DEMO.length}</strong> comprobantes
          </p>
        )}
      </Card>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Número', 'Tipo', 'Cliente', 'Emitido por'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>{h}</th>
              ))}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  className="flex items-center gap-1 text-xs font-black uppercase tracking-widest"
                  style={{ color: B.muted }}
                >
                  Fecha y Hora
                  {sortDir === 'desc'
                    ? <ChevronDown className="w-3.5 h-3.5" style={{ color: B.green }} />
                    : <ChevronUp   className="w-3.5 h-3.5" style={{ color: B.green }} />
                  }
                </button>
              </th>
              {['Monto', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginados.map(c => (
              <tr
                key={c.id}
                className="transition-colors"
                style={{ borderTop: `1px solid ${B.cream}`, opacity: c.estado === 'anulado' ? 0.6 : 1 }}
                onMouseEnter={e => (e.currentTarget.style.background = `${B.cream}60`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-4 py-3 text-sm font-semibold" style={{ color: B.charcoal }}>{c.numero}</td>
                <td className="px-4 py-3"><TipoBadge tipo={c.tipo} /></td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{c.cliente}</td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{c.emitidoPor}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: B.muted }}>{c.fecha}</td>
                <td className="px-4 py-3 text-sm font-bold" style={{ color: B.charcoal }}>S/ {c.monto.toFixed(2)}</td>
                <td className="px-4 py-3"><EstadoBadge estado={c.estado} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg transition-colors" style={{ color: B.green }}
                      onMouseEnter={e => e.currentTarget.style.background = `${B.green}15`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      title="Ver">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg transition-colors" style={{ color: B.gold }}
                      onMouseEnter={e => e.currentTarget.style.background = `${B.gold}15`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      title="Descargar">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginados.length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: B.muted }}>No se encontraron comprobantes</div>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: B.cream }}>
            <p className="text-xs" style={{ color: B.muted }}>
              Página {pagina} de {totalPaginas}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPagina(p)}
                  className="w-8 h-8 rounded-lg text-xs font-semibold transition-all"
                  style={p === pagina
                    ? { background: B.charcoal, color: B.cream }
                    : { background: B.cream, color: B.charcoal }
                  }
                >
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