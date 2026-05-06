// components/cajas/CajasView.tsx
'use client';

import React, { useState } from 'react';
import {
  Plus, Edit, X, TrendingDown, DollarSign, CheckCircle,
  CreditCard, Lock, Eye, Power, Loader2,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, KpiCard, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { crearCaja, abrirCaja, cerrarCaja, registrarEgresoCaja } from '@/lib/supabase/queries';
import type { Caja } from '@/lib/supabase/types';

function inputCls(extra = '') {
  return `w-full px-3 py-2.5 rounded-xl text-sm outline-none ${extra}`;
}
const INP: React.CSSProperties = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };

function ModalBase({ title, onClose, children, actions }: {
  title: string; onClose: () => void;
  children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {actions && <div className="px-6 pb-6 flex gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// ─── Modal Nueva Caja ─────────────────────────────────────────────────────────
function ModalNuevaCaja({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { usuario } = useAuth();
  const [nombre,       setNombre]       = useState('');
  const [montoInicial, setMontoInicial] = useState('0');
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState('');

  const handleGuardar = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setGuardando(true); setError('');
    try {
      await crearCaja(nombre.trim(), usuario?.id ?? null);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalBase title="Nueva Caja" onClose={onClose}
      actions={<>
        <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal }} onClick={onClose}>Cancelar</button>
        <button onClick={handleGuardar} disabled={guardando}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: B.green, color: B.cream }}>
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear
        </button>
      </>}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Nombre de la caja</label>
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Caja 4" className={inputCls()} style={INP} />
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Monto inicial (S/)</label>
          <input type="number" value={montoInicial} onChange={e => setMontoInicial(e.target.value)}
            placeholder="0.00" className={inputCls()} style={INP} />
        </div>
        {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
      </div>
    </ModalBase>
  );
}

// ─── Modal Egreso ─────────────────────────────────────────────────────────────
function ModalEgreso({ caja, onClose, onSaved }: { caja: Caja; onClose: () => void; onSaved: () => void }) {
  const { usuario } = useAuth();
  const [concepto,  setConcepto]  = useState('');
  const [monto,     setMonto]     = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const handleGuardar = async () => {
    if (!concepto.trim() || !monto) { setError('Concepto y monto son obligatorios'); return; }
    setGuardando(true); setError('');
    try {
      await registrarEgresoCaja(caja.id, concepto, parseFloat(monto), usuario!.id);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalBase title={`Egreso · ${caja.nombre}`} onClose={onClose}
      actions={<>
        <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal }} onClick={onClose}>Cancelar</button>
        <button onClick={handleGuardar} disabled={guardando}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: B.terra, color: B.cream }}>
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          Registrar egreso
        </button>
      </>}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Concepto</label>
          <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)}
            placeholder="Ej: Pago proveedor" className={inputCls()} style={INP} />
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Monto (S/)</label>
          <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
            placeholder="0.00" className={inputCls()} style={INP} />
        </div>
        {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
      </div>
    </ModalBase>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function CajasView() {
  const { cajas, isLoading, refetchCajas } = useGlobalData();
  const { usuario } = useAuth();
  const [modalNueva,   setModalNueva]   = useState(false);
  const [modalReporte, setModalReporte] = useState<Caja | null>(null);
  const [modalEgreso,  setModalEgreso]  = useState<Caja | null>(null);
  const [procesando,   setProcesando]   = useState<string | null>(null);

  const totalEnCajas = cajas.reduce((a, c) => a + c.monto_actual, 0);

  const handleAbrirCaja = async (caja: Caja) => {
    if (!usuario) return;
    setProcesando(caja.id);
    try {
      await abrirCaja(caja.id, usuario.id, caja.monto_inicial);
      refetchCajas();
    } catch (e) { console.error(e); }
    finally { setProcesando(null); }
  };

  const handleCerrarCaja = async (caja: Caja) => {
    if (!confirm(`¿Cerrar ${caja.nombre}?`) || !usuario) return;
    setProcesando(caja.id);
    try {
      await cerrarCaja(caja.id, usuario.id);
      refetchCajas();
    } catch (e) { console.error(e); }
    finally { setProcesando(null); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Gestión de Cajas"
        subtitle="Administra el estado y operaciones de las cajas del sistema"
        action={<Btn onClick={() => setModalNueva(true)}><Plus className="w-4 h-4" />Nueva Caja</Btn>}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total en Cajas"  value={`S/ ${totalEnCajas.toFixed(2)}`}                        icon={DollarSign}  color={B.green} />
        <KpiCard label="Total de Cajas"  value={cajas.length}                                           icon={CreditCard}  color={B.gold} />
        <KpiCard label="Cajas Abiertas"  value={cajas.filter(c => c.estado === 'abierta').length}       icon={CheckCircle} color={B.green} />
        <KpiCard label="Cajas Cerradas"  value={cajas.filter(c => c.estado === 'cerrada').length}       icon={Lock}        color={B.terra} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cajas.map(caja => (
          <div key={caja.id} className="rounded-2xl p-5" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold" style={{ color: B.charcoal }}>{caja.nombre}</h3>
                <p className="text-sm" style={{ color: B.muted }}>
                  {(caja.usuario as { nombre?: string } | null)?.nombre ?? 'Sin usuario'}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={caja.estado === 'abierta'
                  ? { background: '#e8f5e2', color: B.green }
                  : { background: '#fee2e2', color: B.terra }}>
                {caja.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
              </span>
            </div>

            <div className="space-y-1.5 mb-4 pb-4 border-b" style={{ borderColor: B.cream }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: B.muted }}>Saldo inicial:</span>
                <span className="font-semibold" style={{ color: B.charcoal }}>S/ {caja.monto_inicial.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: B.muted }}>Saldo actual:</span>
                <span className="text-lg font-black" style={{ color: B.green }}>S/ {caja.monto_actual.toFixed(2)}</span>
              </div>
            </div>

            {caja.fecha_apertura && (
              <div className="text-xs space-y-0.5 mb-4" style={{ color: B.muted }}>
                <p>Apertura: {new Date(caja.fecha_apertura).toLocaleString('es-PE')}</p>
                {caja.fecha_cierre && <p>Cierre: {new Date(caja.fecha_cierre).toLocaleString('es-PE')}</p>}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                {caja.estado === 'abierta' ? (
                  <button onClick={() => handleCerrarCaja(caja)} disabled={procesando === caja.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold disabled:opacity-60"
                    style={{ background: B.terra, color: B.cream }}>
                    {procesando === caja.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Cerrar
                  </button>
                ) : (
                  <button onClick={() => handleAbrirCaja(caja)} disabled={procesando === caja.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold disabled:opacity-60"
                    style={{ background: B.green, color: B.cream }}>
                    {procesando === caja.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                    Abrir
                  </button>
                )}
                <button onClick={() => setModalReporte(caja)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold"
                  style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
                  <Eye className="w-4 h-4" /> Reporte
                </button>
              </div>

              {caja.estado === 'abierta' && (
                <button onClick={() => setModalEgreso(caja)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold"
                  style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
                  <TrendingDown className="w-3.5 h-3.5" /> Registrar egreso
                </button>
              )}

              {caja.estado === 'cerrada' && (
                <p className="text-[10px] text-center py-1.5 rounded-lg" style={{ background: `${B.green}10`, color: B.green }}>
                  💡 Se abrirá automáticamente al iniciar sesión
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {modalNueva && (
        <ModalNuevaCaja onClose={() => setModalNueva(false)}
          onSaved={() => { setModalNueva(false); refetchCajas(); }} />
      )}

      {modalEgreso && (
        <ModalEgreso caja={modalEgreso} onClose={() => setModalEgreso(null)}
          onSaved={() => { setModalEgreso(null); refetchCajas(); }} />
      )}

      {modalReporte && (
        <ModalBase title={`Reporte · ${modalReporte.nombre}`} onClose={() => setModalReporte(null)}>
          <div className="space-y-3">
            <div className="rounded-xl p-4" style={{ background: B.cream }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: B.muted }}>Usuario</span>
                <span className="text-sm font-bold" style={{ color: B.charcoal }}>
                  {(modalReporte.usuario as { nombre?: string } | null)?.nombre ?? '-'}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: B.muted }}>Saldo inicial</span>
                <span className="text-sm font-bold" style={{ color: B.charcoal }}>S/ {modalReporte.monto_inicial.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: B.muted }}>Saldo actual</span>
                <span className="text-lg font-black" style={{ color: B.green }}>S/ {modalReporte.monto_actual.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalReporte(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: B.cream, color: B.charcoal }}>
                Cerrar
              </button>
              <button className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: B.green, color: B.cream }}>
                <Edit className="w-4 h-4" /> Ver movimientos
              </button>
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
}