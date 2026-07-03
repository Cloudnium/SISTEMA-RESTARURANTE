// components/cajas/CajaCard.tsx
'use client';

import {
  Eye, Lock, TrendingDown, Edit, Trash2, CheckCircle, Printer,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { ESTADO_CAJA_STYLES } from '@/constants/cajas/cajasConstants';
import { fmtSoles, fmtFechaLima } from '@/utils/cajas/cajasUtils';
import { useAuth } from '@/lib/auth/AuthContext';
import { BtnCerrarSesion } from '@/components/ui/BtnCerrarSesion';
import type { Caja } from '@/lib/supabase/types';

interface CajaCardProps {
  caja:        Caja;
  esCajero:    boolean;
  onAbrir:     (c: Caja) => void;
  onCerrar:    (c: Caja) => void;
  onReporte:   (c: Caja) => void;
  onEgreso:    (c: Caja) => void;
  onEditar:    (c: Caja) => void;
  onEliminar:  (c: Caja) => void;
  onImprimir?: (c: Caja) => void;
}

export function CajaCard({
  caja, esCajero, onAbrir, onCerrar, onReporte, onEgreso, onEditar, onEliminar, onImprimir,
}: CajaCardProps) {
  const { usuario: yo } = useAuth();
  const abierta         = caja.estado === 'abierta';
  const estadoStyle     = ESTADO_CAJA_STYLES[caja.estado];

  const mostrarCerrarSesion =
    yo?.rol === 'admin' &&
    abierta &&
    caja.usuario_id != null &&
    caja.usuario_id !== yo.id;

  return (
    <div
      className="rounded-2xl p-5 flex flex-col"
      style={{ background: B.white, border: `1px solid ${B.cream}` }}
    >
      {/* ── Encabezado ── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-base font-bold truncate" style={{ color: B.charcoal }}>
            {caja.nombre}
          </h3>
          <p className="text-sm truncate" style={{ color: B.muted }}>
            {caja.usuario?.nombre ?? 'Sin asignar'}
          </p>
          {caja.zona && (
            <p className="text-xs mt-0.5 truncate" style={{ color: B.muted }}>
              {caja.zona}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onImprimir && (
            <button
              onClick={() => onImprimir(caja)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: B.muted }}
              title="Imprimir reporte"
              onMouseEnter={e => { e.currentTarget.style.background = B.cream; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
            style={{ background: estadoStyle.background, color: estadoStyle.color }}
          >
            {estadoStyle.label}
          </span>
        </div>
      </div>

      {/* ── Montos ── */}
      <div className="space-y-1.5 mb-4 pb-4 border-b" style={{ borderColor: B.cream }}>
        <div className="flex justify-between text-sm">
          <span style={{ color: B.muted }}>Saldo inicial</span>
          <span className="font-semibold" style={{ color: B.charcoal }}>
            {fmtSoles(caja.monto_inicial)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: B.muted }}>Saldo actual</span>
          <span className="text-lg font-black" style={{ color: B.green }}>
            {fmtSoles(caja.monto_actual)}
          </span>
        </div>
      </div>

      {/* ── Fechas ── */}
      {caja.fecha_apertura && (
        <div className="text-xs space-y-0.5 mb-4" style={{ color: B.muted }}>
          <p>Apertura: {fmtFechaLima(caja.fecha_apertura)}</p>
          {caja.fecha_cierre && (
            <p>Cierre: {fmtFechaLima(caja.fecha_cierre)}</p>
          )}
        </div>
      )}

      {/* ── Cerrar sesión del cajero (solo admin) ── */}
      {mostrarCerrarSesion && caja.usuario_id && (
        <div className="mb-3 pb-3 border-b" style={{ borderColor: B.cream }}>
          <p className="text-[10px] uppercase tracking-widest mb-1.5 font-bold" style={{ color: B.muted }}>
            Acceso del cajero
          </p>
          <BtnCerrarSesion
            usuario={{ ...caja.usuario!, id: caja.usuario_id }}
          />
        </div>
      )}

      {/* ── Botones principales ── */}
      <div className="space-y-2 mt-auto">
        <div className="flex gap-2">
          {!abierta ? (
            <button
              onClick={() => onAbrir(caja)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold"
              style={{ background: B.green, color: B.cream }}
            >
              <CheckCircle className="w-4 h-4" /> Abrir
            </button>
          ) : (
            <button
              onClick={() => onCerrar(caja)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold"
              style={{ background: B.terra, color: B.cream }}
            >
              <Lock className="w-4 h-4" /> Cerrar
            </button>
          )}
          <button
            onClick={() => onReporte(caja)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold"
            style={{ background: B.charcoal, color: B.cream }}
          >
            <Eye className="w-4 h-4" /> Reporte
          </button>
        </div>

        {/* ── Botones secundarios ── */}
        <div className={`grid gap-2 ${esCajero ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <button
            onClick={() => onEgreso(caja)}
            disabled={!abierta}
            title={!abierta ? 'Abre la caja primero' : 'Registrar egreso'}
            className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold
                       transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#fef0e6', color: B.terra }}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Egreso
          </button>

          {!esCajero && (
            <>
              <button
                onClick={() => onEditar(caja)}
                className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: B.cream, color: B.charcoal }}
                onMouseEnter={e => { e.currentTarget.style.background = B.creamDark; }}
                onMouseLeave={e => { e.currentTarget.style.background = B.cream; }}
              >
                <Edit className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                onClick={() => onEliminar(caja)}
                disabled={abierta}
                title={abierta ? 'Cierra la caja antes de eliminar' : 'Eliminar caja'}
                className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold
                           disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#fee2e2', color: B.terra }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}