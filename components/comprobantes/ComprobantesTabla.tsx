// components/comprobantes/ComprobantesTabla.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Receipt, Eye, Download, Wallet, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { TipoBadge, EstadoBadge } from '@/components/comprobantes/TipoBadge';
import { fmtMoney, fmtFecha } from '@/utils/comprobantes/comprobantesUtils';
import { descargarPdfComprobante } from '@/utils/comprobantes/comprobantePdf';
import { fetchVentaItems } from '@/utils/comprobantes/comprobantesUtils';
import type { CompDetalle, SortDir } from '@/constants/comprobantes//comprobantesConstants';
import { POR_PAGINA } from '@/constants/comprobantes//comprobantesConstants';

interface Props {
  filtrados:  CompDetalle[];
  sortDir:    SortDir;
  pagina:     number;
  onSortDir:  () => void;
  onPagina:   (p: number) => void;
  onAbrirModal: (comp: CompDetalle) => void;
  onCambiarMetodoPago?: (comp: CompDetalle) => void; // ← NUEVO, opcional para no romper otros usos
}

export function ComprobantesTabla({
  filtrados, sortDir, pagina,
  onSortDir, onPagina, onAbrirModal, onCambiarMetodoPago,
}: Props) {
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaReal   = Math.min(pagina, totalPaginas);
  const paginados    = filtrados.slice((paginaReal - 1) * POR_PAGINA, paginaReal * POR_PAGINA);

  // ← NUEVO: id del comprobante cuyo PDF se está generando (para spinner)
  const [descargando, setDescargando] = useState<string | null>(null);

  const pageNums = useMemo(() => {
    const delta = 2;
    const pages: number[] = [];
    for (
      let i = Math.max(1, paginaReal - delta);
      i <= Math.min(totalPaginas, paginaReal + delta);
      i++
    ) pages.push(i);
    return pages;
  }, [paginaReal, totalPaginas]);

  const btnHover = (e: React.MouseEvent<HTMLButtonElement>, enter: boolean) => {
    e.currentTarget.style.background = enter ? B.cream : 'transparent';
  };

  // ← NUEVO: descarga el PDF real (carga items si todavía no los tiene)
  const handleDescargar = async (c: CompDetalle) => {
    if (descargando) return;
    setDescargando(c.id);
    try {
      let compConItems = c;
      if (!c.itemsLoaded && c.venta_id) {
        const items = await fetchVentaItems(c.venta_id).catch(() => []);
        compConItems = { ...c, items, itemsLoaded: true };
      }
      await descargarPdfComprobante(compConItems);
    } catch (e) {
      console.error('Error generando PDF:', e);
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: B.white, border: `1px solid ${B.cream}` }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-640px">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Número', 'Tipo', 'Cliente / Doc.', 'Emitido por'].map(h => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[11px] font-black uppercase tracking-widest"
                  style={{ color: B.muted }}
                >
                  {h}
                </th>
              ))}

              {/* Columna fecha con orden */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={onSortDir}
                  className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest"
                  style={{ color: B.muted }}
                >
                  Fecha
                  {sortDir === 'desc'
                    ? <ChevronDown className="w-3.5 h-3.5" style={{ color: B.green }} />
                    : <ChevronUp   className="w-3.5 h-3.5" style={{ color: B.green }} />}
                </button>
              </th>

              {['Monto', 'Estado', 'Acciones'].map(h => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[11px] font-black uppercase tracking-widest"
                  style={{ color: B.muted }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginados.map(c => (
              <tr
                key={c.id}
                style={{
                  borderTop: `1px solid ${B.cream}`,
                  opacity: c.estado === 'anulado' ? 0.55 : 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = `${B.cream}60`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
              >
                <td className="px-4 py-3 text-sm font-semibold" style={{ color: B.charcoal }}>
                  {c.numero}
                </td>
                <td className="px-4 py-3">
                  <TipoBadge tipo={c.tipo} />
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm" style={{ color: B.charcoal }}>
                    {c.cliente_nombre ?? 'Cliente General'}
                  </p>
                  {c.tipo === 'factura' && c.ruc && (
                    <p className="text-[10px]" style={{ color: B.muted }}>RUC: {c.ruc}</p>
                  )}
                  {c.tipo === 'boleta' && c.dni && (
                    <p className="text-[10px]" style={{ color: B.muted }}>DNI: {c.dni}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>
                  {c.usuario_nombre}
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: B.muted }}>
                  {fmtFecha(c.fecha_emision)}
                </td>
                <td className="px-4 py-3 text-sm font-bold" style={{ color: B.charcoal }}>
                  {fmtMoney(c.monto)}
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={c.estado} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onAbrirModal(c)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: B.green }}
                      onMouseEnter={e => btnHover(e, true)}
                      onMouseLeave={e => btnHover(e, false)}
                      title="Ver comprobante"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* ← CAMBIO: ahora descarga el PDF real, ya no abre el modal */}
                    <button
                      onClick={() => handleDescargar(c)}
                      disabled={descargando === c.id}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                      style={{ color: B.gold }}
                      onMouseEnter={e => btnHover(e, true)}
                      onMouseLeave={e => btnHover(e, false)}
                      title="Descargar PDF"
                    >
                      {descargando === c.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                    </button>

                    {/* ← NUEVO: cambiar método de pago, solo si está emitido y hay handler */}
                    {onCambiarMetodoPago && c.estado === 'emitido' && (
                      <button
                        onClick={() => onCambiarMetodoPago(c)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#4A6FA5' }}
                        onMouseEnter={e => btnHover(e, true)}
                        onMouseLeave={e => btnHover(e, false)}
                        title="Cambiar método de pago"
                      >
                        <Wallet className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {paginados.length === 0 && (
        <div className="py-16 text-center" style={{ color: B.muted }}>
          <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No se encontraron comprobantes</p>
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div
          className="px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2"
          style={{ borderColor: B.cream }}
        >
          <p className="text-xs order-2 sm:order-1" style={{ color: B.muted }}>
            Página {paginaReal} de {totalPaginas} · {filtrados.length} resultados
          </p>
          <div className="flex gap-1 order-1 sm:order-2">
            <button
              onClick={() => onPagina(Math.max(1, paginaReal - 1))}
              disabled={paginaReal === 1}
              className="w-8 h-8 rounded-lg text-xs font-semibold disabled:opacity-30"
              style={{ background: B.cream, color: B.charcoal }}
            >‹</button>

            {paginaReal > 3 && (
              <>
                <button
                  onClick={() => onPagina(1)}
                  className="w-8 h-8 rounded-lg text-xs font-semibold"
                  style={{ background: B.cream, color: B.charcoal }}
                >1</button>
                {paginaReal > 4 && (
                  <span
                    className="w-8 h-8 flex items-center justify-center text-xs"
                    style={{ color: B.muted }}
                  >…</span>
                )}
              </>
            )}

            {pageNums.map(p => (
              <button
                key={p}
                onClick={() => onPagina(p)}
                className="w-8 h-8 rounded-lg text-xs font-semibold"
                style={
                  p === paginaReal
                    ? { background: B.charcoal, color: B.cream }
                    : { background: B.cream,    color: B.charcoal }
                }
              >{p}</button>
            ))}

            {paginaReal < totalPaginas - 2 && (
              <>
                {paginaReal < totalPaginas - 3 && (
                  <span
                    className="w-8 h-8 flex items-center justify-center text-xs"
                    style={{ color: B.muted }}
                  >…</span>
                )}
                <button
                  onClick={() => onPagina(totalPaginas)}
                  className="w-8 h-8 rounded-lg text-xs font-semibold"
                  style={{ background: B.cream, color: B.charcoal }}
                >{totalPaginas}</button>
              </>
            )}

            <button
              onClick={() => onPagina(Math.min(totalPaginas, paginaReal + 1))}
              disabled={paginaReal === totalPaginas}
              className="w-8 h-8 rounded-lg text-xs font-semibold disabled:opacity-30"
              style={{ background: B.cream, color: B.charcoal }}
            >›</button>
          </div>
        </div>
      )}
    </div>
  );
}