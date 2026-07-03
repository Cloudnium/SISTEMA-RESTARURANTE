// components/cajas/CajasView.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, DollarSign, Lock, CreditCard, CheckCircle, Loader2, Calendar } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, KpiCard, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { Caja } from '@/lib/supabase/types';

// ── Componentes hijos ──────────────────────────────────────────────────────
import { CajaCard }        from '@/components/cajas/CajaCard';
import { ModalApertura }   from './modals/ModalApertura';
import { ModalCierre }     from './modals/ModalCierre';
import { ModalReporte }    from './modals/ModalReporte';
import { ModalEgreso }     from './modals/ModalEgreso';
import { ModalEditarCaja } from './modals/ModalEditarCaja';
import { ModalNuevaCaja }  from './modals/ModalNuevaCaja';

// ── Utilidades ─────────────────────────────────────────────────────────────
import {
  fmtSoles, calcularTotalEnCajas, contarCajasPorEstado,
  filtrarMovimientosPorDia, hoyISOLima, buildReportePrintHTML,
} from '@/utils/cajas/cajasUtils';
import { getMovimientosCaja } from '@/lib/supabase/queries';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ── Tipos de modal ─────────────────────────────────────────────────────────
type ModalState =
  | { tipo: 'apertura'; caja: Caja }
  | { tipo: 'cierre';   caja: Caja }
  | { tipo: 'reporte';  caja: Caja }
  | { tipo: 'egreso';   caja: Caja }
  | { tipo: 'editar';   caja: Caja }
  | { tipo: 'nueva' }
  | null;

// ── Componente principal ───────────────────────────────────────────────────
export function CajasView() {
  const { cajas, usuarios, isLoading, refetchCajas } = useGlobalData();
  const { usuario: yo } = useAuth();
  const [modal, setModal] = useState<ModalState>(null);

  // ── Filtro por fecha ────────────────────────────────────────────────────
  const [fechaFiltro, setFechaFiltro] = useState(hoyISOLima());
  const [diaActual,   setDiaActual]   = useState(true);

  const esCajero = yo?.rol === 'cajero';

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('cajas_realtime_view')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cajas' },
        () => { refetchCajas(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchCajas]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalEnCajas = useMemo(() => calcularTotalEnCajas(cajas), [cajas]);
  const { abiertas, cerradas } = useMemo(() => contarCajasPorEstado(cajas), [cajas]);

  // ── Cajas visibles: cajero solo ve la suya ────────────────────────────────
  const cajasVisibles = useMemo(() => {
    if (esCajero) return cajas.filter(c => c.id === yo?.caja_id);
    return cajas;
  }, [cajas, esCajero, yo]);

  // ── Fecha activa del filtro (solo afecta el contenido del Reporte, no las cards) ──
  const fechaActiva = useMemo(
    () => (diaActual ? hoyISOLima() : fechaFiltro),
    [diaActual, fechaFiltro],
  );

  // ── Usuarios libres (sin caja) para modal nueva caja ──────────────────────
  const usuariosLibres = useMemo(
    () => usuarios
      .filter(u => !u.caja_id)
      .map(u => ({ id: u.id, nombre: u.nombre })),
    [usuarios],
  );

  // ── Usuarios para editar una caja: libres + el asignado actualmente ───────
  const usuariosParaEditar = useCallback((caja: Caja) =>
    usuarios
      .filter(u => !u.caja_id || u.id === caja.usuario_id)
      .map(u => ({ id: u.id, nombre: u.nombre })),
  [usuarios]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEliminar = useCallback(async (caja: Caja) => {
    if (caja.estado === 'abierta') return;
    if (!confirm(`¿Eliminar ${caja.nombre}? Esta acción no se puede deshacer.`)) return;
    await db.from('cajas').delete().eq('id', caja.id);
    refetchCajas();
  }, [refetchCajas]);

  const handleImprimirRapido = useCallback(async (caja: Caja) => {
    try {
      const movimientos = await getMovimientosCaja(caja.id);
      const delDia = filtrarMovimientosPorDia(movimientos as never[], fechaActiva);
      const w = window.open('', '_blank', 'width=440,height=720');
      if (!w) return;
      w.document.write(buildReportePrintHTML(caja, delDia as never));
      w.document.close();
      setTimeout(() => w.print(), 350);
    } catch (e) {
      console.error('Error al imprimir reporte:', e);
    }
  }, [fechaActiva]);

  const onGuardado = useCallback(() => {
    setModal(null);
    refetchCajas();
  }, [refetchCajas]);

  const handleFechaChange = (v: string) => {
    setFechaFiltro(v);
    setDiaActual(false);
  };

  const handleDiaActual = () => {
    setDiaActual(true);
    setFechaFiltro(hoyISOLima());
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <PageHeader
        title="Gestión de Cajas"
        subtitle="Administra el estado y operaciones de las cajas del sistema"
        action={
          !esCajero ? (
            <Btn onClick={() => setModal({ tipo: 'nueva' })}>
              <Plus className="w-4 h-4" /> Nueva Caja
            </Btn>
          ) : undefined
        }
      />

      {/* ── KPIs (solo admin) ── */}
      {!esCajero && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          <KpiCard label="Total en Cajas" value={fmtSoles(totalEnCajas)} icon={DollarSign} color={B.green} />
          <KpiCard label="Total Cajas"    value={cajas.length}           icon={CreditCard} color={B.gold}  />
          <KpiCard label="Abiertas"       value={abiertas}               icon={CheckCircle} color={B.green} />
          <KpiCard label="Cerradas"       value={cerradas}               icon={Lock}        color={B.terra} />
        </div>
      )}

      {/* ── Filtro por fecha (afecta el contenido del Reporte de cada caja, no su visibilidad) ── */}
      <div
        className="rounded-2xl p-4 mb-5"
        style={{ background: B.white, border: `1px solid ${B.cream}` }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold shrink-0" style={{ color: B.charcoal }}>
            <Calendar className="w-4 h-4" style={{ color: B.green }} />
            Reportes por Fecha
          </div>
          <input
            type="date"
            value={fechaFiltro}
            onChange={e => handleFechaChange(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none w-full sm:w-auto"
            style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
          />
          <button
            onClick={handleDiaActual}
            className="px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 justify-center shrink-0"
            style={{
              background: diaActual ? '#e8f5e2' : B.cream,
              color:      diaActual ? B.green   : B.muted,
            }}
          >
            <CheckCircle className="w-3.5 h-3.5" /> Día actual
          </button>
        </div>
        <p className="text-[11px] mt-2" style={{ color: B.muted }}>
          Esta fecha define qué movimientos se muestran al abrir el Reporte o imprimir cada caja.
        </p>
      </div>

      {/* ── Grid de cajas ── */}
      {cajasVisibles.length === 0 ? (
        <div className="text-center py-16" style={{ color: B.muted }}>
          <p className="text-sm">
            {esCajero ? 'No tienes una caja asignada.' : 'No hay cajas configuradas.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cajasVisibles.map(caja => (
            <CajaCard
              key={caja.id}
              caja={caja}
              esCajero={esCajero}
              onAbrir={c     => setModal({ tipo: 'apertura', caja: c })}
              onCerrar={c    => setModal({ tipo: 'cierre',   caja: c })}
              onReporte={c   => setModal({ tipo: 'reporte',  caja: c })}
              onEgreso={c    => setModal({ tipo: 'egreso',   caja: c })}
              onEditar={c    => setModal({ tipo: 'editar',   caja: c })}
              onEliminar={handleEliminar}
              onImprimir={handleImprimirRapido}
            />
          ))}
        </div>
      )}

      {/* ── Modales ── */}
      {modal?.tipo === 'apertura' && (
        <ModalApertura caja={modal.caja} onClose={() => setModal(null)} onSaved={onGuardado} />
      )}
      {modal?.tipo === 'cierre' && (
        <ModalCierre caja={modal.caja} onClose={() => setModal(null)} onSaved={onGuardado} />
      )}
      {modal?.tipo === 'reporte' && (
        <ModalReporte
          key={modal.caja.id}
          caja={modal.caja}
          fecha={fechaActiva}
          onClose={() => setModal(null)}
          onEgreso={c => setModal({ tipo: 'egreso', caja: c })}
        />
      )}
      {modal?.tipo === 'egreso' && (
        <ModalEgreso caja={modal.caja} onClose={() => setModal(null)} onSaved={onGuardado} />
      )}
      {modal?.tipo === 'editar' && (
        <ModalEditarCaja
          caja={modal.caja}
          onClose={() => setModal(null)}
          onSaved={onGuardado}
          usuarios={usuariosParaEditar(modal.caja)}
        />
      )}
      {modal?.tipo === 'nueva' && (
        <ModalNuevaCaja
          onClose={() => setModal(null)}
          onSaved={onGuardado}
          usuarios={usuariosLibres}
        />
      )}
    </div>
  );
}