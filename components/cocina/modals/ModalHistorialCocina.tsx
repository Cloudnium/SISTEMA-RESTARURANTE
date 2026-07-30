// components/cocina/modals/ModalHistorialCocina.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, History, Loader2, ChefHat, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { B } from '@/lib/brand';
import { getProduccionPorFecha } from '@/lib/supabase/queries';
import type { ProduccionCocina } from '@/lib/supabase/types';

interface ModalHistorialCocinaProps {
  onClose: () => void;
}

const POR_PAGINA = 20;

function fmtHora(hora: string) {
  return hora?.slice(0, 5) ?? '';
}

function hoyLima() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // "2026-07-29"
}

function fmtFechaLabel(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long' });
}

export function ModalHistorialCocina({ onClose }: ModalHistorialCocinaProps) {
  const [fecha,     setFecha]     = useState(hoyLima());
  const [historial, setHistorial] = useState<ProduccionCocina[]>([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState('');
  const [pagina,    setPagina]    = useState(1);

  // ── Reset de página al cambiar de día ──────────────────────────────────────
  // Patrón "ajustar estado durante el render" en vez de un useEffect: evita
  // el aviso del compilador de React sobre setState directo dentro de un
  // efecto, y además es más inmediato (no espera un ciclo extra de render).
  const [fechaAnterior, setFechaAnterior] = useState(fecha);
  if (fecha !== fechaAnterior) {
    setFechaAnterior(fecha);
    setPagina(1);
  }

  // ── Carga de datos al cambiar de día ───────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const cargar = async () => {
      // Estos setState quedan dentro de la función-callback del efecto
      // (no como primera línea suelta del cuerpo del efecto), que es el
      // patrón que recomienda React para efectos de carga de datos.
      setCargando(true);
      setError('');
      try {
        const data = await getProduccionPorFecha(fecha);
        if (mounted) setHistorial(data);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Error al cargar el historial');
      } finally {
        if (mounted) setCargando(false);
      }
    };

    cargar();
    return () => { mounted = false; };
  }, [fecha]);

  const totalPaginas = Math.max(1, Math.ceil(historial.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const visibles = useMemo(() => {
    const inicio = (paginaSegura - 1) * POR_PAGINA;
    return historial.slice(inicio, inicio + POR_PAGINA);
  }, [historial, paginaSegura]);

  const esHoy = fecha === hoyLima();

  const cambiarDia = (delta: number) => {
    const [y, m, d] = fecha.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    const nuevaFecha = new Intl.DateTimeFormat('en-CA').format(dt); // "YYYY-MM-DD"
    if (nuevaFecha > hoyLima()) return; // no permitir días futuros
    setFecha(nuevaFecha);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: B.cream }}
        >
          <div className="flex items-center gap-2">
            <History className="w-4.5 h-4.5" style={{ color: B.green }} />
            <h2 className="text-base font-black" style={{ color: B.charcoal }}>
              Historial de cocina
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: B.muted }}
            onMouseEnter={e => (e.currentTarget.style.background = B.cream)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegación por día */}
        <div
          className="flex items-center justify-between gap-2 px-5 py-3 border-b shrink-0"
          style={{ borderColor: B.cream, background: B.cream }}
        >
          <button
            onClick={() => cambiarDia(-1)}
            className="p-1.5 rounded-lg shrink-0"
            style={{ color: B.charcoal, background: B.white }}
            title="Día anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: B.muted }} />
            <span className="text-xs font-bold truncate capitalize" style={{ color: B.charcoal }}>
              {esHoy ? 'Hoy' : fmtFechaLabel(fecha)}
            </span>
          </div>

          <button
            onClick={() => cambiarDia(1)}
            disabled={esHoy}
            className="p-1.5 rounded-lg shrink-0 disabled:opacity-30"
            style={{ color: B.charcoal, background: B.white }}
            title="Día siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de fecha directo */}
        <div className="px-5 pt-3 shrink-0">
          <input
            type="date"
            value={fecha}
            max={hoyLima()}
            onChange={e => e.target.value && setFecha(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
          />
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: B.green }} />
            </div>
          ) : error ? (
            <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>
              {error}
            </p>
          ) : historial.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16" style={{ color: B.muted }}>
              <ChefHat className="w-10 h-10 opacity-25" />
              <p className="text-sm">
                {esHoy ? 'Aún no hay platos marcados como listos hoy' : 'No hubo platos marcados como listos ese día'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibles.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: B.cream }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: B.charcoal }}>
                      {p.cantidad} {p.unidad} · {p.producto?.nombre ?? 'Producto'}
                    </p>
                    {p.notas && (
                      <p className="text-xs truncate" style={{ color: B.muted }}>
                        {p.notas}
                      </p>
                    )}
                    {p.usuario?.nombre && (
                      <p className="text-[11px]" style={{ color: B.muted }}>
                        Por {p.usuario.nombre}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-semibold shrink-0" style={{ color: B.green }}>
                    {fmtHora(p.hora)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paginación */}
        {!cargando && historial.length > POR_PAGINA && (
          <div
            className="flex items-center justify-between px-5 py-3 border-t shrink-0"
            style={{ borderColor: B.cream }}
          >
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={paginaSegura === 1}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-30"
              style={{ background: B.cream, color: B.charcoal }}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className="text-xs" style={{ color: B.muted }}>
              Página {paginaSegura} de {totalPaginas} · {historial.length} registros
            </span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaSegura === totalPaginas}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-30"
              style={{ background: B.cream, color: B.charcoal }}
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}