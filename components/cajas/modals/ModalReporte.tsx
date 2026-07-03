// components/cajas/modals/ModalReporte.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, Loader2, RefreshCw, Printer, Wallet, TrendingUp, TrendingDown,
  Landmark, Receipt, AlertCircle, TrendingDown as IconEgresoBtn,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { getMovimientosCaja } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';
import {
  fmtSoles, fmtFechaLima, fmtFechaSoloLima, calcularResumenMetodosPago,
  buildReportePrintHTML, ahoraLimaComoUTC, filtrarMovimientosPorDia,
} from '@/utils/cajas/cajasUtils';
import { METODOS_PAGO_LABELS, ORDEN_METODOS_PAGO } from '@/constants/cajas/cajasConstants';
import type { Caja, MovimientoCaja } from '@/lib/supabase/types';

const POR_PAGINA_MOVS = 6;

interface ModalReporteProps {
  caja:      Caja;
  /** Fecha activa del filtro principal (yyyy-mm-dd, Lima). Si se omite, muestra todo el historial. */
  fecha?:    string;
  onClose:   () => void;
  onEgreso?: (caja: Caja) => void;
}

export function ModalReporte({ caja, fecha, onClose, onEgreso }: ModalReporteProps) {
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [pagina,      setPagina]      = useState(1);

  const cargar = useCallback(() => {
    return getMovimientosCaja(caja.id)
      .then(data => setMovimientos(data as MovimientoCaja[]))
      .catch(console.error);
  }, [caja.id]);

  useEffect(() => {
    // No llamamos setLoading(true) aquí: el estado inicial ya es `true`.
    // El padre renderiza este modal con key={caja.id}, así que al cambiar
    // de caja el componente se vuelve a montar y el loading inicial se reinicia solo.
    cargar().finally(() => setLoading(false));

    // Realtime: actualiza la lista ante cualquier cambio en movimientos_caja de esta caja
    const channel = supabase
      .channel(`movimientos_caja_${caja.id}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'movimientos_caja',
          filter: `caja_id=eq.${caja.id}`,
        },
        () => { cargar(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [caja.id, cargar]);

  const handleRefrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  // ── Movimientos respetando el filtro de fecha activo en la vista principal ──
  const movimientosDelDia = useMemo(
    () => (fecha ? filtrarMovimientosPorDia(movimientos, fecha) : movimientos),
    [movimientos, fecha],
  );

  // ── Paginación (clamp en render, sin efectos extra) ─────────────────────────
  const totalPaginas = Math.max(1, Math.ceil(movimientosDelDia.length / POR_PAGINA_MOVS));
  const paginaReal    = Math.min(pagina, totalPaginas);
  const movimientosPaginados = movimientosDelDia.slice(
    (paginaReal - 1) * POR_PAGINA_MOVS,
    paginaReal * POR_PAGINA_MOVS,
  );

  const handleImprimir = () => {
    const w = window.open('', '_blank', 'width=440,height=720');
    if (!w) return;
    w.document.write(buildReportePrintHTML(caja, movimientosDelDia));
    w.document.close();
    setTimeout(() => w.print(), 350);
  };

  const totalIngresos = movimientosDelDia
    .filter(m => m.tipo === 'ingreso')
    .reduce((a, m) => a + m.monto, 0);

  const totalEgresos = movimientosDelDia
    .filter(m => m.tipo === 'egreso')
    .reduce((a, m) => a + m.monto, 0);

  const ventasCount   = movimientosDelDia.filter(m => m.tipo === 'ingreso').length;
  const egresosCount  = movimientosDelDia.filter(m => m.tipo === 'egreso').length;
  const promedio      = ventasCount > 0 ? totalIngresos / ventasCount : 0;
  const saldoFinal    = caja.monto_inicial + totalIngresos - totalEgresos;
  const metodosPago   = calcularResumenMetodosPago(movimientosDelDia);
  const abierta       = caja.estado === 'abierta';

  const kpis = [
    { label: 'Saldo Inicial', value: caja.monto_inicial, icon: Wallet,       bg: '#e8f0fb', color: '#4A6FA5' },
    { label: 'Ingresos',      value: totalIngresos,      icon: TrendingUp,   bg: '#e8f5e2', color: '#5C7A3E' },
    { label: 'Egresos',       value: totalEgresos,       icon: TrendingDown, bg: '#fdeae0', color: B.terra   },
    { label: 'Saldo Final',   value: saldoFinal,          icon: Landmark,     bg: '#f1e9fb', color: '#7B5EA7' },
  ] as const;

  const stats = [
    { label: 'Ventas',      value: ventasCount },
    { label: 'Promedio',    value: fmtSoles(promedio) },
    { label: 'Movimientos', value: movimientosDelDia.length },
    { label: 'Egresos',     value: egresosCount },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col"
        style={{ background: B.white, maxHeight: 'calc(100dvh - 24px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0"
          style={{ borderColor: B.cream }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#e8f0fb' }}
            >
              <Wallet className="w-4 h-4" style={{ color: '#4A6FA5' }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate" style={{ color: B.charcoal }}>
                Reporte de Caja
              </h2>
              <p className="text-xs truncate" style={{ color: B.muted }}>
                {caja.nombre}{caja.usuario && ` · Cajero: ${caja.usuario.nombre}`}
                {fecha && ` · ${fmtFechaSoloLima(`${fecha}T00:00:00.000Z`)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleRefrescar}
              className="p-1.5 rounded-lg"
              style={{ color: B.muted }}
              title="Refrescar"
              onMouseEnter={e => { e.currentTarget.style.background = B.cream; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <RefreshCw className={`w-4 h-4 ${refrescando ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleImprimir}
              className="p-1.5 rounded-lg"
              style={{ color: B.muted }}
              title="Imprimir"
              onMouseEnter={e => { e.currentTarget.style.background = B.cream; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg"
              style={{ color: B.muted }}
              onMouseEnter={e => { e.currentTarget.style.background = B.cream; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Estado de caja */}
          <div
            className="rounded-xl p-3 sm:p-4 mb-4 flex items-center justify-between"
            style={{ background: B.cream }}
          >
            <div>
              <p className="text-xs font-bold" style={{ color: B.muted }}>Estado de Caja</p>
              <p className="text-[11px] mt-0.5" style={{ color: B.muted }}>
                Hoy: {fmtFechaLima(ahoraLimaComoUTC())}
              </p>
            </div>
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
              style={{
                background: abierta ? '#e8f5e2' : '#fee2e2',
                color:      abierta ? '#5C7A3E' : '#D4673A',
              }}
            >
              {abierta ? 'Abierta' : 'Cerrada'}
            </span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {kpis.map(k => (
              <div key={k.label} className="rounded-xl p-3" style={{ background: k.bg }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-semibold" style={{ color: k.color }}>{k.label}</p>
                  <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                </div>
                <p className="text-lg font-black" style={{ color: k.color }}>
                  {fmtSoles(k.value)}
                </p>
              </div>
            ))}
          </div>

          {/* Resumen por método de pago */}
          <div
            className="rounded-xl p-3 sm:p-4 mb-4"
            style={{ border: `1px solid ${B.cream}` }}
          >
            <p
              className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-1.5"
              style={{ color: B.muted }}
            >
              <Receipt className="w-3.5 h-3.5" /> Resumen por Método de Pago
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ORDEN_METODOS_PAGO.map(m => {
                const valor = metodosPago[m] ?? 0;
                const activo = valor > 0;
                return (
                  <div
                    key={m}
                    className="rounded-lg px-3 py-2"
                    style={{
                      background: activo ? '#e8f5e2' : B.cream,
                      border: activo ? `1px solid ${B.green}` : `1px solid ${B.cream}`,
                    }}
                  >
                    <p className="text-[10px] font-semibold" style={{ color: activo ? B.green : B.muted }}>
                      {METODOS_PAGO_LABELS[m]}
                    </p>
                    <p className="text-sm font-black" style={{ color: activo ? B.green : B.charcoal }}>
                      {fmtSoles(valor)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div
              className="rounded-xl px-4 py-3 mt-3 flex items-center justify-between"
              style={{ background: `${B.green}12` }}
            >
              <span className="text-sm font-bold" style={{ color: B.charcoal }}>Total Ingresos</span>
              <span className="text-lg font-black" style={{ color: B.green }}>
                {fmtSoles(totalIngresos)}
              </span>
            </div>
          </div>

          {/* Contadores */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {stats.map(s => (
              <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: B.cream }}>
                <p className="text-[10px]" style={{ color: B.muted }}>{s.label}</p>
                <p className="text-sm font-black mt-0.5" style={{ color: B.charcoal }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Lista de movimientos */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>
              Últimos Movimientos ({movimientosDelDia.length})
            </p>
            {fecha && (
              <p className="text-[10px]" style={{ color: B.muted }}>
                {fmtFechaSoloLima(`${fecha}T00:00:00.000Z`)}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: B.green }} />
            </div>
          ) : movimientosDelDia.length === 0 ? (
            <div className="text-center py-6" style={{ color: B.muted }}>
              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin movimientos registrados en esta fecha</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {movimientosPaginados.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl gap-3"
                    style={{ background: B.cream }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: B.charcoal }}>
                        {m.concepto}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: B.muted }}>
                        {fmtFechaLima(m.created_at)}
                      </p>
                    </div>
                    <span
                      className="text-sm font-black shrink-0"
                      style={{ color: m.tipo === 'ingreso' ? B.green : B.terra }}
                    >
                      {m.tipo === 'ingreso' ? '+' : '-'}{fmtSoles(m.monto)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs" style={{ color: B.muted }}>
                    Página {paginaReal} de {totalPaginas}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      disabled={paginaReal === 1}
                      className="w-8 h-8 rounded-lg text-xs font-semibold disabled:opacity-30"
                      style={{ background: B.cream, color: B.charcoal }}
                    >‹</button>
                    <button
                      onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaReal === totalPaginas}
                      className="w-8 h-8 rounded-lg text-xs font-semibold disabled:opacity-30"
                      style={{ background: B.cream, color: B.charcoal }}
                    >›</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 sm:px-6 py-4 border-t shrink-0 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between"
          style={{ borderColor: B.cream }}
        >
          {onEgreso && abierta ? (
            <button
              onClick={() => onEgreso(caja)}
              className="py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: '#fee2e2', color: B.terra }}
            >
              <IconEgresoBtn className="w-4 h-4" /> Registrar Egreso
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}