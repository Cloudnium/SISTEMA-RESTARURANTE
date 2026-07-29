// components/insumos/modals/ModalHistorial.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Calendar, FileSpreadsheet, FileText,
  Filter, Loader2, Search, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { Paginacion } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { PERIODO_OPTIONS, TIPO_OPTIONS, POR_PAGINA_HISTORIAL } from '@/constants/insumos/insumosConstants';
import {
  calcFechaInicioLima, fmtLimaFecha, fmtLimaHora,
  type HistorialItem, type PeriodoFiltro, type TipoFiltro,
} from '@/utils/insumos/insumosUtils';
import { exportarHistorialExcel } from '@/utils/insumos/exportarHistorialExcel';
import { exportarHistorialPdf } from '@/utils/insumos/exportarHistorialPdf';

export default function ModalHistorial({ onClose }: {
  onClose: () => void;
}) {
  const [historial,   setHistorial]   = useState<HistorialItem[]>([]);
  const [cargando,    setCargando]    = useState(true);
  const [periodo,     setPeriodo]     = useState<PeriodoFiltro>('hoy');
  const [tipoFiltro,  setTipoFiltro]  = useState<TipoFiltro>('todos');
  const [insumoBusc,  setInsumoBusc]  = useState('');
  const [paginaHist,  setPaginaHist]  = useState(1);
  const [exportando,  setExportando]  = useState<'excel' | 'pdf' | null>(null);

  const cargar = useCallback(() => {
    // Diferir para evitar setState síncrono en el effect
    setTimeout(async () => {
      setCargando(true);
      try {
      const fechaInicio = calcFechaInicioLima(periodo);

      // Consultar movimientos_almacen filtrando por tipo consumo/ajuste en cocina
      const { data, error } = await supabase
        .from('movimientos_almacen')
        .select(`
          id,
          producto_id,
          tipo,
          cantidad,
          stock_cocina_antes,
          stock_cocina_despues,
          stock_tienda_antes,
          stock_tienda_despues,
          observacion,
          created_at,
          producto:productos(nombre),
          usuario:usuarios(nombre)
        `)
        .in('tipo', ['ajuste', 'salida_cocina', 'traslado'])
        .gte('created_at', `${fechaInicio}T00:00:00-05:00`)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const items: HistorialItem[] = (data ?? []).map((r: Record<string, unknown>) => {
        const prod = r.producto as Record<string, unknown> | null;
        const usr  = r.usuario  as Record<string, unknown> | null;
        // Detectar la zona real del movimiento viendo qué par antes/después cambió,
        // en vez de usar ?? (las columnas no usadas quedan en 0 por defecto en la BD,
        // no en null, así que ?? elegía "tienda" incluso para movimientos de cocina)
        const tAntes   = (r.stock_tienda_antes   as number | null) ?? 0;
        const tDespues = (r.stock_tienda_despues as number | null) ?? 0;
        const cAntes   = (r.stock_cocina_antes   as number | null) ?? 0;
        const cDespues = (r.stock_cocina_despues as number | null) ?? 0;
        const tiendaCambio = tDespues !== tAntes;
        const stockAntes   = tiendaCambio ? tAntes   : cAntes;
        const stockDespues = tiendaCambio ? tDespues : cDespues;
        const delta = stockDespues - stockAntes;
        return {
          id:               r.id as string,
          producto_id:      r.producto_id as string,
          producto_nombre:  prod ? (prod.nombre as string) : (r.producto_id as string),
          delta,
          stock_resultante: stockDespues,
          observacion:      r.observacion as string | null,
          usuario_nombre:   usr ? (usr.nombre as string) : null,
          created_at:       r.created_at as string,
        };
      });

      setHistorial(items);
      } catch (e) {
        console.error('Error al cargar historial:', e);
      } finally {
        setCargando(false);
      }
    }, 0); // fin setTimeout
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel('historial-insumos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movimientos_almacen' }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [cargar]);

  const filtrados = useMemo(() => historial.filter(h => {
    const matchTipo = tipoFiltro === 'todos'
      || (tipoFiltro === 'consumo' && h.delta < 0)
      || (tipoFiltro === 'ingreso' && h.delta > 0);
    const matchInsumo = !insumoBusc || h.producto_nombre.toLowerCase().includes(insumoBusc.toLowerCase());
    return matchTipo && matchInsumo;
  }), [historial, tipoFiltro, insumoBusc]);

  const [prevHistKey, setPrevHistKey] = useState(`${tipoFiltro}|${insumoBusc}|${periodo}`);
  const histKey = `${tipoFiltro}|${insumoBusc}|${periodo}`;
  if (histKey !== prevHistKey) { setPrevHistKey(histKey); setPaginaHist(1); }

  const totalPaginasHist = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA_HISTORIAL));
  const paginaHistSegura = Math.min(paginaHist, totalPaginasHist);
  const visiblesHist = filtrados.slice((paginaHistSegura - 1) * POR_PAGINA_HISTORIAL, paginaHistSegura * POR_PAGINA_HISTORIAL);

  const totalConsumo = filtrados.filter(h => h.delta < 0).reduce((s, h) => s + Math.abs(h.delta), 0);
  const totalIngreso = filtrados.filter(h => h.delta > 0).reduce((s, h) => s + h.delta, 0);

  const periodoLabel = PERIODO_OPTIONS.find(p => p.key === periodo)?.label ?? periodo;
  const tipoLabel     = TIPO_OPTIONS.find(t => t.key === tipoFiltro)?.label ?? tipoFiltro;

  // Exporta siempre el conjunto ya filtrado (período + tipo + búsqueda de producto)
  const handleExportarExcel = () => {
    if (exportando || filtrados.length === 0) return;
    setExportando('excel');
    try {
      exportarHistorialExcel({ items: filtrados, periodoLabel, tipoLabel, busqueda: insumoBusc });
    } finally {
      setExportando(null);
    }
  };

  const handleExportarPdf = () => {
    if (exportando || filtrados.length === 0) return;
    setExportando('pdf');
    try {
      exportarHistorialPdf({ items: filtrados, periodoLabel, tipoLabel, busqueda: insumoBusc, totalConsumo, totalIngreso });
    } finally {
      setExportando(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-6xl shadow-2xl max-h-[92vh] flex flex-col"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b shrink-0 flex-wrap" style={{ borderColor: B.cream }}>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 shrink-0" style={{ color: B.terra }} />
            <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Historial de Movimientos</h2>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={handleExportarExcel} disabled={exportando !== null || filtrados.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-opacity"
              style={{ background: B.green, color: B.cream, opacity: (exportando !== null || filtrados.length === 0) ? 0.5 : 1 }}>
              {exportando === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button onClick={handleExportarPdf} disabled={exportando !== null || filtrados.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-opacity"
              style={{ background: B.terra, color: B.cream, opacity: (exportando !== null || filtrados.length === 0) ? 0.5 : 1 }}>
              {exportando === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg shrink-0" style={{ color: B.muted }}
              onMouseEnter={e => e.currentTarget.style.background = B.cream}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtros unificados */}
        <div className="px-4 sm:px-6 py-4 shrink-0 space-y-3" style={{ borderBottom: `1px solid ${B.cream}` }}>
          {/* Fila 1: Período */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 shrink-0" style={{ color: B.muted }} />
            <span className="text-xs font-black uppercase tracking-wide" style={{ color: B.muted }}>Período:</span>
            {PERIODO_OPTIONS.map(p => (
              <button key={p.key} onClick={() => setPeriodo(p.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={periodo === p.key
                  ? { background: B.charcoal, color: B.cream }
                  : { background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Fila 2: Tipo + Búsqueda de insumo */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 shrink-0" style={{ color: B.muted }} />
            <span className="text-xs font-black uppercase tracking-wide" style={{ color: B.muted }}>Tipo:</span>
            {TIPO_OPTIONS.map(t => (
              <button key={t.key} onClick={() => setTipoFiltro(t.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={tipoFiltro === t.key
                  ? { background: t.key === 'consumo' ? B.terra : t.key === 'ingreso' ? B.green : B.charcoal, color: B.cream }
                  : { background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
                {t.label}
              </button>
            ))}
            <div className="flex-1 min-w-40 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: B.muted }} />
              <input value={insumoBusc} onChange={e => setInsumoBusc(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none"
                style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
            </div>
          </div>

          {/* KPIs del período */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-3"
              style={{ background: '#fef0e6', border: `1px solid ${B.terra}20` }}>
              <TrendingDown className="w-4 h-4 shrink-0" style={{ color: B.terra }} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: B.terra }}>Total consumido</p>
                <p className="text-lg font-black" style={{ color: B.terra }}>{totalConsumo.toFixed(2)}</p>
              </div>
            </div>
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-3"
              style={{ background: '#e8f5e2', border: `1px solid ${B.green}20` }}>
              <TrendingUp className="w-4 h-4 shrink-0" style={{ color: B.green }} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: B.green }}>Total ingresado</p>
                <p className="text-lg font-black" style={{ color: B.green }}>{totalIngreso.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista historial */}
        <div className="overflow-y-auto overflow-x-auto flex-1">
          {cargando ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: B.green }} /></div>
          ) : filtrados.length === 0 ? (
            <div className="py-16 text-center" style={{ color: B.muted }}>
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin registros en este período</p>
            </div>
          ) : (
            <table className="w-full min-w-720px">
              <thead className="sticky top-0" style={{ background: B.cream }}>
                <tr>
                  {['Fecha/Hora', 'Producto', 'Movimiento', 'Stock res.', 'Motivo', 'Usuario'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
                      style={{ color: B.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiblesHist.map(h => {
                  const esConsumo = h.delta < 0;
                  return (
                    <tr key={h.id} style={{ borderTop: `1px solid ${B.cream}` }}
                      onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-3 text-xs" style={{ color: B.muted }}>
                        {fmtLimaFecha(h.created_at)}<br />
                        <span className="text-[10px]">{fmtLimaHora(h.created_at)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: B.charcoal }}>{h.producto_nombre}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm font-black"
                          style={{ color: esConsumo ? B.terra : B.green }}>
                          {esConsumo ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                          {esConsumo ? '' : '+'}{h.delta.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: B.charcoal }}>{h.stock_resultante.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: B.muted }}>{h.observacion ?? '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: B.muted }}>{h.usuario_nombre ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <Paginacion page={paginaHistSegura} totalPages={totalPaginasHist} onChange={setPaginaHist}
          totalItems={filtrados.length} pageSize={POR_PAGINA_HISTORIAL} />
      </div>
    </div>
  );
}