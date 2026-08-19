// components/insumos/modals/ModalHistorial.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Calendar, FileSpreadsheet, FileText, History,
  Loader2, Package, Search, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { Paginacion } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { useGlobalData } from '@/context/GlobalDataContext';
import { TIPO_OPTIONS, POR_PAGINA_HISTORIAL } from '@/constants/insumos/insumosConstants';
import {
  calcFechaInicioLima, limiteConsultaISO, fmtLimaFecha, fmtLimaHora,
  type HistorialItem, type TipoFiltro,
} from '@/utils/insumos/insumosUtils';
import { exportarHistorialExcel } from '@/utils/insumos/exportarHistorialExcel';
import { exportarHistorialPdf } from '@/utils/insumos/exportarHistorialPdf';

const HOY = calcFechaInicioLima('hoy');

// Caché en memoria (fuera del componente) por rango "desde|hasta": el modal se
// desmonta por completo al cerrarse (`{modalHistorial && <ModalHistorial/>}`),
// así que sin esto perdía todo y volvía a mostrar el loader cada vez que se
// abría. No es un caché "congelado": cada apertura sigue disparando un
// refetch en segundo plano (silencioso) que actualiza esta caché y la
// pantalla, igual que en ReportesView. Solo se ve el loader la primera vez
// que se consulta un rango nuevo en la sesión.
const historialCache: Record<string, HistorialItem[]> = {};

export default function ModalHistorial({ onClose }: {
  onClose: () => void;
}) {
  const { productos } = useGlobalData();

  const claveInicial = `${HOY}|${HOY}`;
  const [historial,      setHistorial]      = useState<HistorialItem[]>(() => historialCache[claveInicial] ?? []);
  const [cargando,       setCargando]       = useState(() => !historialCache[claveInicial]);
  const [fechaDesde,     setFechaDesde]     = useState(HOY);
  const [fechaHasta,     setFechaHasta]     = useState(HOY);
  const [tipoFiltro,     setTipoFiltro]     = useState<TipoFiltro>('todos');
  const [productoFiltro, setProductoFiltro] = useState('todos');
  const [paginaHist,     setPaginaHist]     = useState(1);
  const [exportando,     setExportando]     = useState<'excel' | 'pdf' | null>(null);

  // Catálogo para el selector "Producto" (mismos insumos que se listan en la vista)
  const catalogoInsumos = useMemo(
    () => productos.filter(p => p.tipo === 'producto_venta' && p.activo)
      .slice().sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [productos],
  );

  const cargar = useCallback(() => {
    // Diferir para evitar setState síncrono en el effect
    setTimeout(async () => {
      // Si "Desde" quedó después de "Hasta", se usan invertidas para no devolver vacío
      const desde = fechaDesde <= fechaHasta ? fechaDesde : fechaHasta;
      const hasta = fechaDesde <= fechaHasta ? fechaHasta : fechaDesde;
      const clave = `${desde}|${hasta}`;

      // Si ya hay datos cacheados de este rango, se muestran de inmediato y el
      // fetch de abajo corre en segundo plano (sin loader) para refrescarlos.
      const cacheado = historialCache[clave];
      if (cacheado) {
        setHistorial(cacheado);
        setCargando(false);
      } else {
        setCargando(true);
      }
      try {
      // Mismo bug de 5h del DEFAULT de created_at en la BD (ver insumosUtils.ts):
      // lo guardado está atrasado 5h respecto al instante real, así que hay que
      // compensarlo también en los límites que le mandamos a Postgres.
      const limiteDesde = limiteConsultaISO(desde);
      const limiteHasta = limiteConsultaISO(hasta, 1); // exclusivo: inicio del día siguiente

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
          producto:productos(nombre, categoria),
          usuario:usuarios(nombre)
        `)
        .in('tipo', ['ajuste', 'salida_cocina', 'traslado'])
        .gte('created_at', limiteDesde)
        .lt('created_at', limiteHasta)
        .order('created_at', { ascending: false })
        .limit(500);

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
          categoria:        prod ? (prod.categoria as string) : '—',
          delta,
          stock_antes:      stockAntes,
          stock_resultante: stockDespues,
          observacion:      r.observacion as string | null,
          usuario_nombre:   usr ? (usr.nombre as string) : null,
          created_at:       r.created_at as string,
        };
      });

      historialCache[clave] = items;
      setHistorial(items);
      } catch (e) {
        console.error('Error al cargar historial:', e);
      } finally {
        setCargando(false);
      }
    }, 0); // fin setTimeout
  }, [fechaDesde, fechaHasta]);

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
    const matchProducto = productoFiltro === 'todos' || h.producto_id === productoFiltro;
    return matchTipo && matchProducto;
  }), [historial, tipoFiltro, productoFiltro]);

  const [prevHistKey, setPrevHistKey] = useState(`${tipoFiltro}|${productoFiltro}|${fechaDesde}|${fechaHasta}`);
  const histKey = `${tipoFiltro}|${productoFiltro}|${fechaDesde}|${fechaHasta}`;
  if (histKey !== prevHistKey) { setPrevHistKey(histKey); setPaginaHist(1); }

  const totalPaginasHist = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA_HISTORIAL));
  const paginaHistSegura = Math.min(paginaHist, totalPaginasHist);
  const visiblesHist = filtrados.slice((paginaHistSegura - 1) * POR_PAGINA_HISTORIAL, paginaHistSegura * POR_PAGINA_HISTORIAL);

  const totalConsumo = filtrados.filter(h => h.delta < 0).reduce((s, h) => s + Math.abs(h.delta), 0);
  const totalIngreso = filtrados.filter(h => h.delta > 0).reduce((s, h) => s + h.delta, 0);

  const tipoLabel      = TIPO_OPTIONS.find(t => t.key === tipoFiltro)?.label ?? tipoFiltro;
  const productoLabel  = productoFiltro === 'todos'
    ? 'Todos los productos'
    : (catalogoInsumos.find(p => p.id === productoFiltro)?.nombre ?? 'Todos los productos');
  const fmtDMY = (ymd: string) => { const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}`; };
  const rangoLabel = fechaDesde === fechaHasta ? fmtDMY(fechaDesde) : `${fmtDMY(fechaDesde)} - ${fmtDMY(fechaHasta)}`;

  // Exporta siempre el conjunto ya filtrado (rango de fechas + tipo + producto)
  const handleExportarExcel = () => {
    if (exportando || filtrados.length === 0) return;
    setExportando('excel');
    try {
      exportarHistorialExcel({ items: filtrados, rangoLabel, tipoLabel, productoLabel });
    } finally {
      setExportando(null);
    }
  };

  const handleExportarPdf = () => {
    if (exportando || filtrados.length === 0) return;
    setExportando('pdf');
    try {
      exportarHistorialPdf({
        items: filtrados, rangoLabel, tipoLabel, productoLabel,
        totalMovimientos: filtrados.length, totalIngreso, totalSalida: totalConsumo,
      });
    } finally {
      setExportando(null);
    }
  };

  const inputClase = 'w-full px-3 py-2 rounded-xl text-xs outline-none';
  const inputEstilo = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };
  const labelClase = 'block text-[10px] font-black uppercase tracking-wide mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-6xl shadow-2xl max-h-[92vh] flex flex-col"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: B.cream }}>
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-5 h-5 shrink-0" style={{ color: B.terra }} />
            <h2 className="text-lg font-bold truncate" style={{ color: B.charcoal }}>Historial de Movimientos</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg shrink-0" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros unificados */}
        <div className="px-4 sm:px-6 py-4 shrink-0 space-y-3" style={{ borderBottom: `1px solid ${B.cream}` }}>
          {/* Fila 1: Desde / Hasta / Producto / Tipo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={labelClase} style={{ color: B.muted }}>
                <Calendar className="w-3 h-3 inline mr-1 -mt-0.5" />Desde
              </label>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                className={inputClase} style={inputEstilo} />
            </div>
            <div>
              <label className={labelClase} style={{ color: B.muted }}>
                <Calendar className="w-3 h-3 inline mr-1 -mt-0.5" />Hasta
              </label>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                className={inputClase} style={inputEstilo} />
            </div>
            <div>
              <label className={labelClase} style={{ color: B.muted }}>
                <Package className="w-3 h-3 inline mr-1 -mt-0.5" />Producto
              </label>
              <select value={productoFiltro} onChange={e => setProductoFiltro(e.target.value)}
                className={inputClase} style={inputEstilo}>
                <option value="todos">Todos los productos</option>
                {catalogoInsumos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClase} style={{ color: B.muted }}>
                <Search className="w-3 h-3 inline mr-1 -mt-0.5" />Tipo
              </label>
              <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value as TipoFiltro)}
                className={inputClase} style={inputEstilo}>
                {TIPO_OPTIONS.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* KPIs del rango filtrado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-3"
              style={{ background: '#faf3e0', border: `1px solid ${B.gold}30` }}>
              <BarChart3 className="w-4 h-4 shrink-0" style={{ color: B.gold }} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: B.gold }}>Total movimientos</p>
                <p className="text-lg font-black" style={{ color: B.charcoal }}>{filtrados.length}</p>
              </div>
            </div>
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-3"
              style={{ background: '#e8f5e2', border: `1px solid ${B.green}20` }}>
              <TrendingUp className="w-4 h-4 shrink-0" style={{ color: B.green }} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: B.green }}>Unidades ingresadas</p>
                <p className="text-lg font-black" style={{ color: B.green }}>+{totalIngreso.toFixed(2)}</p>
              </div>
            </div>
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-3"
              style={{ background: '#fef0e6', border: `1px solid ${B.terra}20` }}>
              <TrendingDown className="w-4 h-4 shrink-0" style={{ color: B.terra }} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: B.terra }}>Unidades salidas</p>
                <p className="text-lg font-black" style={{ color: B.terra }}>-{totalConsumo.toFixed(2)}</p>
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
              <p className="text-sm">Sin registros en este rango</p>
            </div>
          ) : (
            <table className="w-full min-w-900px">
              <thead className="sticky top-0" style={{ background: B.cream }}>
                <tr>
                  {['Fecha/Hora', 'Producto', 'Categoría', 'Tipo', 'Motivo', 'Cantidad', 'Stock', 'Usuario'].map(h => (
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
                      <td className="px-4 py-3 text-xs" style={{ color: B.muted }}>{h.categoria}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase"
                          style={{
                            background: esConsumo ? '#fef0e6' : '#e8f5e2',
                            color: esConsumo ? B.terra : B.green,
                          }}>
                          {esConsumo ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          {esConsumo ? 'Salida' : 'Entrada'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: B.muted }}>{h.observacion ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-black" style={{ color: esConsumo ? B.terra : B.green }}>
                        {esConsumo ? '' : '+'}{h.delta.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: B.charcoal }}>
                        {h.stock_antes.toFixed(2)} <span style={{ color: B.muted }}>→</span> {h.stock_resultante.toFixed(2)}
                      </td>
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

        {/* Pie: total encontrado + acciones */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t flex-wrap shrink-0" style={{ borderColor: B.cream }}>
          <p className="text-xs font-semibold" style={{ color: B.muted }}>
            {filtrados.length} movimiento{filtrados.length === 1 ? '' : 's'} encontrado{filtrados.length === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
              Cerrar
            </button>
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
          </div>
        </div>
      </div>
    </div>
  );
}