// components/mesas/MesaModal.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  X, CheckCircle, Users, Receipt,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import type { EstadoMesa } from '@/lib/supabase/types';
import { ESTADOS, type EstadoConfig } from '@/constants/mesas/mesasConstants';
import { fmtSoles, type MesaRow } from '@/utils/mesas/mesasUtils';
import ModalComanda from './modals/ModalComanda';
import ModalVerCuenta from './modals/ModalVerCuenta';

interface Props {
  mesa:            MesaRow;
  cajaAbierta:     boolean;       // ← nueva prop recibida desde MesasView
  onClose:         () => void;
  onCambiarEstado: (id: string, estado: EstadoMesa) => Promise<void>;
  cambiando:       boolean;
}

export default function MesaModal({ mesa, cajaAbierta, onClose, onCambiarEstado, cambiando }: Props) {
  const { usuario } = useAuth();
  const estado: EstadoMesa = mesa.estado ?? 'disponible';
  const est = ESTADOS[estado];

  const [mostrarCambiarEstado, setMostrarCambiarEstado] = useState(false);
  const [modalComanda,         setModalComanda]         = useState(false);
  const [modalCuenta,          setModalCuenta]          = useState(false);

  const usuarioId = usuario?.id ?? '';
  const cajaId    = usuario?.caja_id ?? undefined;
  const consumo   = mesa.pedido_total != null ? fmtSoles(mesa.pedido_total) : 'S/ 0.00';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(30,30,40,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={!cambiando ? onClose : undefined}
      >
        <div
          className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          style={{ background: B.white }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-5"
            style={{ borderBottom: `1px solid ${B.cream}` }}
          >
            <h2 className="text-xl font-bold" style={{ color: B.charcoal }}>
              {mesa.nombre ?? `Mesa ${mesa.numero}`}
              {mesa.zona
                ? <span className="font-normal text-base"> — {mesa.zona}</span>
                : null}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: B.muted }}
              onMouseEnter={e => e.currentTarget.style.background = B.cream}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Info card */}
          <div className="mx-6 mt-5 mb-4 rounded-2xl overflow-hidden" style={{ background: B.cream }}>
            <div className="px-5 pt-5 pb-4">
              <p className="text-2xl font-bold mb-4" style={{ color: B.charcoal }}>
                {mesa.nombre ?? `Mesa ${mesa.numero}`}
              </p>

              {[
                {
                  label: 'Estado',
                  content: (
                    <span
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                      style={{ background: est.bg, color: est.color, border: `1px solid ${est.color}40` }}
                    >
                      <est.icon className="w-3.5 h-3.5 shrink-0" />{est.label}
                    </span>
                  ),
                },
                {
                  label: 'Mesa para',
                  content: (
                    <span className="text-sm font-bold" style={{ color: B.charcoal }}>
                      {mesa.capacidad} personas
                    </span>
                  ),
                },
                {
                  label: 'Consumo',
                  content: (
                    <span className="text-sm font-bold" style={{ color: B.charcoal }}>{consumo}</span>
                  ),
                },
                ...(estado === 'ocupada' && mesa.mozo
                  ? [{
                      label: 'Mozo',
                      content: (
                        <span className="text-sm font-semibold" style={{ color: B.charcoal }}>
                          {mesa.mozo}
                        </span>
                      ),
                    }]
                  : []),
                ...(estado === 'ocupada' && mesa.pedido_inicio
                  ? [{
                      label: 'Desde',
                      content: (
                        <span className="text-sm font-semibold" style={{ color: B.charcoal }}>
                          {new Date(mesa.pedido_inicio).toLocaleTimeString('es-PE', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                          {mesa.minutos_ocupada != null && ` · ${mesa.minutos_ocupada} min`}
                        </span>
                      ),
                    }]
                  : []),
              ].map(({ label, content }, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-3"
                  style={{ borderTop: `1px solid ${B.creamDark}` }}
                >
                  <span className="text-sm" style={{ color: B.muted }}>{label}</span>
                  {content}
                </div>
              ))}
            </div>
          </div>

          {/* Aviso caja cerrada — solo si la caja no está abierta */}
          {!cajaAbierta && (
            <div
              className="mx-6 mb-4 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold"
              style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}
            >
              🔒 Abre tu caja para poder cobrar
            </div>
          )}

          {/* Submenú cambiar estado */}
          {mostrarCambiarEstado && (
            <div
              className="mx-6 mb-4 rounded-2xl overflow-hidden"
              style={{ background: B.cream, border: `1px solid ${B.creamDark}` }}
            >
              <div className="p-3 space-y-1">
                {(Object.entries(ESTADOS) as [EstadoMesa, EstadoConfig][]).map(([key, val]) => {
                  const esActual = estado === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (!esActual) {
                          onCambiarEstado(mesa.id, key);
                          setMostrarCambiarEstado(false);
                        }
                      }}
                      disabled={cambiando || esActual}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: esActual ? val.bg : 'transparent',
                        color:      esActual ? val.color : B.charcoal,
                        border:     `1px solid ${esActual ? val.color : 'transparent'}`,
                        cursor:     esActual ? 'default' : cambiando ? 'not-allowed' : 'pointer',
                        opacity:    cambiando && !esActual ? 0.5 : 1,
                      }}
                    >
                      <val.icon className="w-4 h-4 shrink-0" style={{ color: val.color }} />
                      {val.label}
                      {esActual && <CheckCircle className="w-4 h-4 ml-auto" style={{ color: val.color }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="px-6 pb-6 flex flex-wrap gap-2">
            {/* Abrir Comanda — bloqueado si caja cerrada */}
            <button
              onClick={cajaAbierta ? () => setModalComanda(true) : undefined}
              disabled={!cajaAbierta}
              title={!cajaAbierta ? 'Debes abrir tu caja antes de cobrar' : undefined}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-1 justify-center transition-all"
              style={{
                background: cajaAbierta ? '#7C3AED' : B.muted,
                color:      '#fff',
                cursor:     cajaAbierta ? 'pointer' : 'not-allowed',
              }}
            >
              <CheckCircle className="w-4 h-4" />
              {cajaAbierta ? 'Abrir Comanda' : '🔒 Caja cerrada'}
            </button>

            <button
              onClick={() => setMostrarCambiarEstado(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}
            >
              <Users className="w-4 h-4" />Cambiar Estado
              <span style={{ fontSize: 10 }}>{mostrarCambiarEstado ? '▲' : '▼'}</span>
            </button>

            <button
              onClick={() => setModalCuenta(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}
              onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
              onMouseLeave={e => e.currentTarget.style.background = B.cream}
            >
              <Receipt className="w-4 h-4" />Ver Cuenta
            </button>

            <button
              onClick={() => onCambiarEstado(mesa.id, 'disponible')}
              disabled={cambiando}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: '#EF4444', color: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <X className="w-4 h-4" />Cancelar Mesa
            </button>
          </div>
        </div>
      </div>

      {modalComanda && (
        <ModalComanda
          mesa={mesa}
          usuarioId={usuarioId}
          cajaId={cajaId}
          cajaAbierta={cajaAbierta}
          onClose={() => setModalComanda(false)}
          onPagado={() => { setModalComanda(false); onClose(); }}
        />
      )}

      {modalCuenta && (
        <ModalVerCuenta mesa={mesa} onClose={() => setModalCuenta(false)} />
      )}
    </>
  );
}