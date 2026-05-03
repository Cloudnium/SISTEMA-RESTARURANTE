'use client';

import React, { useState } from 'react';
import {
  Plus, Edit, X, TrendingDown, DollarSign, CheckCircle, CreditCard,
  Lock, Eye, Power,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, KpiCard, Btn } from '@/components/ui';

// ─── Shared helpers ───────────────────────────────────────────────────────────
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

interface Caja {
  id: string; nombre: string; usuario: string;
  estado: 'abierta' | 'cerrada'; saldoInicial: number; saldoActual: number;
  apertura: string | null; cierre: string | null;
}

const CAJAS_DEMO: Caja[] = [
  { id:'1', nombre:'Caja 1', usuario:'Alex',  estado:'abierta',  saldoInicial:23725.20, saldoActual:24497.20, apertura:'03/05/2026, 10:48 a.m.', cierre:null },
  { id:'2', nombre:'Caja 2', usuario:'Sandy', estado:'cerrada',  saldoInicial:0,        saldoActual:0,        apertura:'02/05/2026, 3:27 p.m.',  cierre:'02/05/2026, 7:43 p.m.' },
  { id:'3', nombre:'Caja 3', usuario:'Caro',  estado:'cerrada',  saldoInicial:356.00,   saldoActual:356.00,   apertura:'03/05/2026, 10:44 a.m.', cierre:'03/05/2026, 12:05 p.m.' },
];

export function CajasView() {
  const [modalNueva, setModalNueva]       = useState(false);
  const [modalReporte, setModalReporte]   = useState<Caja | null>(null);
  const totalEnCajas = CAJAS_DEMO.reduce((a, c) => a + c.saldoActual, 0);

  return (
    <div>
      <PageHeader
        title="Gestión de Cajas"
        subtitle="Administra el estado y operaciones de las cajas del sistema"
        action={<Btn onClick={() => setModalNueva(true)}><Plus className="w-4 h-4" />Nueva Caja</Btn>}
      />

      {/* Métricas */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total en Cajas"   value={`S/ ${totalEnCajas.toFixed(2)}`} icon={DollarSign}   color={B.green} />
        <KpiCard label="Total de Cajas"   value={CAJAS_DEMO.length}               icon={CreditCard}   color={B.gold} />
        <KpiCard label="Cajas Abiertas"   value={CAJAS_DEMO.filter(c=>c.estado==='abierta').length}  icon={CheckCircle} color={B.green} />
        <KpiCard label="Cajas Cerradas"   value={CAJAS_DEMO.filter(c=>c.estado==='cerrada').length}  icon={Lock}       color={B.terra} />
      </div>

      {/* Lista de cajas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CAJAS_DEMO.map(caja => (
          <div key={caja.id} className="rounded-2xl p-5" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold" style={{ color: B.charcoal }}>{caja.nombre}</h3>
                <p className="text-sm" style={{ color: B.muted }}>{caja.usuario}</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={caja.estado === 'abierta'
                  ? { background: '#e8f5e2', color: B.green }
                  : { background: '#fee2e2', color: B.terra }
                }>
                {caja.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
              </span>
            </div>

            {/* Saldos */}
            <div className="space-y-1.5 mb-4 pb-4 border-b" style={{ borderColor: B.cream }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: B.muted }}>Saldo inicial:</span>
                <span className="font-semibold" style={{ color: B.charcoal }}>S/ {caja.saldoInicial.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: B.muted }}>Saldo actual:</span>
                <span className="text-lg font-black" style={{ color: B.green }}>S/ {caja.saldoActual.toFixed(2)}</span>
              </div>
            </div>

            {/* Fechas */}
            {caja.apertura && (
              <div className="text-xs space-y-0.5 mb-4" style={{ color: B.muted }}>
                <p>Apertura: {caja.apertura}</p>
                {caja.cierre && <p>Cierre: {caja.cierre}</p>}
              </div>
            )}

            {/* Acciones */}
            <div className="space-y-2">
              <div className="flex gap-2">
                {caja.estado === 'abierta' && (
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold"
                    style={{ background: B.terra, color: B.cream }}>
                    <Lock className="w-4 h-4" /> Cerrar
                  </button>
                )}
                <button onClick={() => setModalReporte(caja)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold"
                  style={{ background: B.green, color: B.cream }}>
                  <Eye className="w-4 h-4" /> Reporte
                </button>
              </div>
              {caja.estado === 'cerrada' && (
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold"
                    style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
                    <TrendingDown className="w-3.5 h-3.5" /> Egresos
                  </button>
                  <button className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold"
                    style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button className="col-span-2 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold"
                    style={{ background: '#fee2e2', color: B.terra }}>
                    <Power className="w-3.5 h-3.5" /> Deshabilitar
                  </button>
                </div>
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

      {/* Modal nueva caja */}
      {modalNueva && (
        <ModalBase title="Nueva Caja" onClose={() => setModalNueva(false)}
          actions={<>
            <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: B.cream, color: B.charcoal }} onClick={() => setModalNueva(false)}>Cancelar</button>
            <button className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: B.green, color: B.cream }}>Crear</button>
          </>}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Nombre de la caja</label>
              <input type="text" placeholder="Ej: Caja 4" className={inputCls()} style={INP} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Usuario asignado</label>
              <select className={inputCls()} style={INP}>
                <option>Alex</option><option>Sandy</option><option>Caro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Monto inicial (S/)</label>
              <input type="number" placeholder="0.00" className={inputCls()} style={INP} />
            </div>
          </div>
        </ModalBase>
      )}

      {/* Modal reporte */}
      {modalReporte && (
        <ModalBase title={`Reporte · ${modalReporte.nombre}`} onClose={() => setModalReporte(null)}>
          <div className="space-y-3">
            <div className="rounded-xl p-4" style={{ background: B.cream }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: B.muted }}>Usuario</span>
                <span className="text-sm font-bold" style={{ color: B.charcoal }}>{modalReporte.usuario}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: B.muted }}>Saldo inicial</span>
                <span className="text-sm font-bold" style={{ color: B.charcoal }}>S/ {modalReporte.saldoInicial.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: B.muted }}>Saldo actual</span>
                <span className="text-lg font-black" style={{ color: B.green }}>S/ {modalReporte.saldoActual.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-center text-sm py-4" style={{ color: B.muted }}>
              El reporte completo con ventas y egresos se integrará con Supabase.
            </p>
          </div>
        </ModalBase>
      )}
    </div>
  );
}