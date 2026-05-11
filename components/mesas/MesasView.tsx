'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus, Users, Clock, CheckCircle, CircleCheck,
  UtensilsCrossed, Sparkles, CalendarClock, Loader2, X, Receipt,
  ShoppingCart, Tag, AlertTriangle, Banknote, CreditCard, Smartphone,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn } from '@/components/ui';

import { useGlobalData } from '@/context/GlobalDataContext';
import { actualizarEstadoMesa, crearMesa } from '@/lib/supabase/queries';
import type { EstadoMesa, Mesa } from '@/lib/supabase/types';
import Image from 'next/image';

interface EstadoConfig {
  label: string; color: string; bg: string; icon: React.ElementType;
}

const ESTADOS: Record<EstadoMesa, EstadoConfig> = {
  disponible: { label: 'Disponible', color: '#5C7A3E', bg: '#e8f5e2', icon: CircleCheck },
  ocupada:    { label: 'Ocupada',    color: '#D4673A', bg: '#fef0e6', icon: UtensilsCrossed },
  limpieza:   { label: 'Limpieza',   color: '#C9A84C', bg: '#fdf8e6', icon: Sparkles },
  reservada:  { label: 'Reservada',  color: '#4A6FA5', bg: '#e8f0fb', icon: CalendarClock },
};

const ICONOS: Record<EstadoMesa, string> = {
  disponible: '/icons/disponible.png',
  ocupada:    '/icons/ocupada.png',
  limpieza:   '/icons/limpieza.png',
  reservada:  '/icons/reservada.png',
};

const COLOR_FILTERS: Record<EstadoMesa, string> = {
  disponible: 'invert(38%) sepia(28%) saturate(600%) hue-rotate(60deg) brightness(90%)',
  ocupada:    'invert(45%) sepia(60%) saturate(700%) hue-rotate(340deg) brightness(95%)',
  limpieza:   'invert(65%) sepia(50%) saturate(600%) hue-rotate(10deg) brightness(95%)',
  reservada:  'invert(35%) sepia(40%) saturate(600%) hue-rotate(190deg) brightness(90%)',
};

// Estados que cierran el modal al seleccionarlos
const ESTADOS_CIERRAN_MODAL: EstadoMesa[] = ['disponible', 'limpieza', 'reservada'];

function IlustracionMesa({ estado }: { estado: EstadoMesa }) {
  return (
    <Image
      src={ICONOS[estado]} alt="" width={65} height={65} aria-hidden="true"
      className="w-full h-full object-contain"
      style={{ filter: COLOR_FILTERS[estado] }}
    />
  );
}

type MesaRow = Mesa & {
  pedido_id?: string | null;
  pedido_total?: number | null;
  pedido_inicio?: string | null;
  minutos_ocupada?: number | null;
  mozo?: string | null;
};

// ─── MesaCard ─────────────────────────────────────────────────────────────────
function MesaCard({ mesa, onClick }: { mesa: MesaRow; onClick: (m: MesaRow) => void }) {
  const estado: EstadoMesa = mesa.estado ?? 'disponible';
  const est = ESTADOS[estado];
  const cliente     = mesa.mozo ?? null;
  const pedidoTotal = mesa.pedido_total != null ? `S/ ${Number(mesa.pedido_total).toFixed(2)}` : null;
  const hora        = mesa.pedido_inicio
    ? new Date(mesa.pedido_inicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <button onClick={() => onClick(mesa)}
      className="rounded-2xl p-4 text-left transition-all duration-200 relative overflow-hidden flex flex-row items-stretch"
      style={{ background: est.bg, border: `1.5px solid ${est.color}30`, minHeight: 130 }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px ${est.color}30`; e.currentTarget.style.borderColor = est.color; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = `${est.color}30`; }}>

      <div className="flex flex-col gap-1.5 flex-1 min-w-0 z-10">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-black tracking-widest uppercase" style={{ color: est.color }}>
            {mesa.nombre ?? `Mesa ${mesa.numero}`}
          </p>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" style={{ color: B.muted }} />
            <span className="text-[10px]" style={{ color: B.muted }}>{mesa.capacidad} pers.</span>
          </div>
        </div>

        {estado === 'ocupada' && (
          <div className="mt-auto">
            {cliente     && <p className="text-xs font-semibold truncate" style={{ color: B.charcoal }}>{cliente}</p>}
            {pedidoTotal && <p className="text-xs font-bold" style={{ color: est.color }}>{pedidoTotal}</p>}
            {hora && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" style={{ color: B.muted }} />
                <span className="text-[10px]" style={{ color: B.muted }}>{hora}</span>
              </div>
            )}
          </div>
        )}

        {estado !== 'ocupada' && (
          <p className="text-[10px] mt-auto" style={{ color: B.muted }}>
            {estado === 'disponible' ? 'Lista para atender'
              : estado === 'limpieza' ? 'En limpieza'
              : estado === 'reservada' ? 'Reservada' : ''}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end justify-between shrink-0 pointer-events-none" style={{ width: 65 }}>
        <span className="pointer-events-auto flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full"
          style={{ background: `${est.color}18`, color: est.color, border: `1px solid ${est.color}30` }}>
          <est.icon className="w-2.5 h-2.5 shrink-0" />
          {est.label}
        </span>
        <div style={{ opacity: 0.55 }} aria-hidden="true">
          <IlustracionMesa estado={estado} />
        </div>
      </div>
    </button>
  );
}

// ─── Modal Nueva Mesa ─────────────────────────────────────────────────────────
function ModalNuevaMesa({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [numero,    setNumero]    = useState('');
  const [nombre,    setNombre]    = useState('');
  const [zona,      setZona]      = useState('');
  const [capacidad, setCapacidad] = useState('4');
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const inp: React.CSSProperties = {
    background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
  };

  const handleGuardar = async () => {
    if (!numero.trim() || !zona.trim()) { setError('Número y zona son obligatorios'); return; }
    setGuardando(true); setError('');
    try {
      await crearMesa({
        numero: numero.trim(),
        nombre: nombre.trim() || `Mesa ${numero.trim()}`,
        zona:   zona.trim(),
        capacidad: parseInt(capacidad) || 4,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Nueva Mesa</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {[
            { label: 'Número / ID', val: numero, set: setNumero, ph: 'M01, T02, B03...' },
            { label: 'Nombre (opcional)', val: nombre, set: setNombre, ph: 'Mesa 1, Mesa Terraza...' },
            { label: 'Zona', val: zona, set: setZona, ph: 'Salón Principal, Terraza, Barra...' },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>{label}</label>
              <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          ))}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Capacidad</label>
            <input type="number" min="1" max="20" value={capacidad} onChange={e => setCapacidad(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}>
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear mesa
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tipos para comanda ───────────────────────────────────────────────────────
interface ProductoComanda {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number; // precio unitario
}

// TODO: reemplazar con fetch real a Supabase cuando exista la tabla de comandas
const MOCK_PRODUCTOS: ProductoComanda[] = [
  { id: '1', nombre: 'Lomo Saltado',      cantidad: 1, precio: 45.00 },
  { id: '2', nombre: 'Agua Mineral',      cantidad: 2, precio: 5.00  },
  { id: '3', nombre: 'Torta de Chocolate',cantidad: 1, precio: 15.00 },
  { id: '4', nombre: 'Café Americano',    cantidad: 2, precio: 8.00  },
];

const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo',  icon: Banknote },
  { id: 'tarjeta',  label: 'Tarjeta',   icon: CreditCard },
  { id: 'yape',     label: 'Yape',      icon: Smartphone },
  { id: 'plin',     label: 'Plin',      icon: Smartphone },
] as const;
type MetodoPago = typeof METODOS_PAGO[number]['id'];

// ─── Modal Cerrar Cuenta ──────────────────────────────────────────────────────
function ModalCerrarCuenta({ mesa, onClose }: { mesa: MesaRow; onClose: () => void }) {
  // TODO: reemplazar MOCK_PRODUCTOS con datos reales de Supabase
  const productos = MOCK_PRODUCTOS;

  const [descuento,      setDescuento]      = useState('');
  const [multa,          setMulta]          = useState('');
  const [metodoPago,     setMetodoPago]     = useState<MetodoPago>('efectivo');
  const [efectivoRecibido, setEfectivoRecibido] = useState('');

  const subtotal   = productos.reduce((s, p) => s + p.cantidad * p.precio, 0);
  const descVal    = parseFloat(descuento)  || 0;
  const multaVal   = parseFloat(multa)      || 0;
  const total      = Math.max(0, subtotal - descVal + multaVal);
  const vuelto     = metodoPago === 'efectivo'
    ? Math.max(0, (parseFloat(efectivoRecibido) || 0) - total)
    : null;

  // Split products en dos columnas
  const col1 = productos.filter((_, i) => i % 2 === 0);
  const col2 = productos.filter((_, i) => i % 2 === 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(20,20,30,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: B.white, maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${B.cream}` }}>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: B.charcoal }}>
            <Receipt className="w-5 h-5" style={{ color: '#7C3AED' }} />
            Cerrar Cuenta — {mesa.nombre ?? `Mesa ${mesa.numero}`}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* Datos del cliente */}
          <div className="rounded-2xl p-4" style={{ background: B.cream }}>
            <p className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: B.charcoal }}>
              <Users className="w-4 h-4" /> Datos del cliente
            </p>
            <div className="flex gap-6 text-sm">
              <div>
                <span style={{ color: B.muted }}>Cliente: </span>
                <span className="font-semibold" style={{ color: B.charcoal }}>
                  {mesa.mozo ?? 'Cliente General'}
                </span>
              </div>
              <div>
                <span style={{ color: B.muted }}>DNI: </span>
                {/* TODO: conectar con datos reales del cliente */}
                <span className="font-semibold" style={{ color: B.charcoal }}>00000000</span>
              </div>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="rounded-2xl p-4" style={{ background: B.cream }}>
            <p className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: B.charcoal }}>
              <ShoppingCart className="w-4 h-4" /> Lista de productos
            </p>
            {/* Dos columnas */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[col1, col2].map((col, ci) => (
                <div key={ci} className="space-y-1.5">
                  {col.map(p => (
                    <div key={p.id} className="flex items-baseline justify-between text-sm">
                      <span style={{ color: B.charcoal }}>
                        <span className="font-bold mr-1">{p.cantidad}</span>{p.nombre}
                      </span>
                      <span className="font-semibold ml-2 shrink-0" style={{ color: B.charcoal }}>
                        S/. {(p.cantidad * p.precio).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Descuento + Subtotal */}
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl shrink-0"
              style={{ color: '#16a34a', background: '#dcfce7', border: '1px solid #86efac' }}>
              <Tag className="w-4 h-4" />
              Descuento (opcional, S/.)
            </button>
            <input
              type="number" min="0" placeholder="0.00"
              value={descuento} onChange={e => setDescuento(e.target.value)}
              className="w-24 px-3 py-2 rounded-xl text-sm outline-none text-right"
              style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
            <div className="ml-auto text-right">
              <span className="text-xs" style={{ color: B.muted }}>Subtotal Consumo: </span>
              <span className="font-bold" style={{ color: B.charcoal }}>S/. {subtotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Total + Multa */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-base font-black uppercase" style={{ color: B.charcoal }}>
              Total a cobrar
            </span>
            <div className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: B.cream, border: `1px solid ${B.creamDark}`, minWidth: 80, textAlign: 'right', color: B.charcoal }}>
              {descuento ? `S/. ${Math.max(0, subtotal - descVal).toFixed(2)}` : '—'}
            </div>
            <button
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl shrink-0"
              style={{ color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d' }}>
              <AlertTriangle className="w-4 h-4" />
              Multa por daños (opcional, S/.)
            </button>
            <input
              type="number" min="0" placeholder="0.00"
              value={multa} onChange={e => setMulta(e.target.value)}
              className="w-24 px-3 py-2 rounded-xl text-sm outline-none text-right"
              style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
            <span className="ml-auto font-black text-lg" style={{ color: '#7C3AED' }}>
              S/. {total.toFixed(2)}
            </span>
          </div>

          {/* Método de pago */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>
              Método de pago
            </p>
            <div className="grid grid-cols-4 gap-2">
              {METODOS_PAGO.map(m => {
                const activo = metodoPago === m.id;
                return (
                  <button key={m.id}
                    onClick={() => setMetodoPago(m.id)}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: activo ? '#7C3AED' : B.cream,
                      color:      activo ? '#fff'    : B.charcoal,
                      border:     `1px solid ${activo ? '#7C3AED' : B.creamDark}`,
                    }}>
                    <m.icon className="w-4 h-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Efectivo recibido + Vuelto */}
          {metodoPago === 'efectivo' && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>
                Efectivo recibido (S/.)
              </p>
              <input
                type="number" min="0" placeholder="0.00"
                value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
              {vuelto !== null && vuelto >= 0 && efectivoRecibido && (
                <p className="text-sm" style={{ color: B.muted }}>
                  Vuelto:{' '}
                  <span className="text-xl font-black" style={{ color: '#7C3AED' }}>
                    S/. {vuelto.toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: `1px solid ${B.cream}` }}>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>
            Cancelar
          </button>
          <button
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: '#7C3AED', color: '#fff' }}>
            <CheckCircle className="w-4 h-4" />
            Confirmar Pago
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MesaModal ────────────────────────────────────────────────────────────────
function MesaModal({ mesa, onClose, onCambiarEstado, cambiando }: {
  mesa: MesaRow;
  onClose: () => void;
  onCambiarEstado: (id: string, estado: EstadoMesa) => Promise<void>;
  cambiando: boolean;
}) {
  const estado: EstadoMesa = mesa.estado ?? 'disponible';
  const est = ESTADOS[estado];
  const [mostrarCambiarEstado, setMostrarCambiarEstado] = useState(false);
  const [modalComanda, setModalComanda] = useState(false);

  const consumo = mesa.pedido_total != null ? `S/. ${Number(mesa.pedido_total).toFixed(2)}` : 'S/. 0.00';

  return <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(30,30,40,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={!cambiando ? onClose : undefined}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ background: B.white }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${B.cream}` }}>
          <h2 className="text-xl font-bold" style={{ color: B.charcoal }}>
            {mesa.nombre ?? `Mesa ${mesa.numero}`}
            {mesa.zona ? <span className="font-normal text-base"> — {mesa.zona}</span> : null}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info card */}
        <div className="mx-6 mt-5 mb-4 rounded-2xl overflow-hidden" style={{ background: B.cream }}>
          {/* Nombre de mesa grande */}
          <div className="px-5 pt-5 pb-4">
            <p className="text-2xl font-bold mb-4" style={{ color: B.charcoal }}>
              {mesa.nombre ?? `Mesa ${mesa.numero}`}
            </p>

            {/* Fila: Estado */}
            <div className="flex items-center justify-between py-3" style={{ borderTop: `1px solid ${B.creamDark}` }}>
              <span className="text-sm" style={{ color: B.muted }}>Estado</span>
              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: est.bg, color: est.color, border: `1px solid ${est.color}40` }}>
                <est.icon className="w-3.5 h-3.5 shrink-0" />
                {est.label}
              </span>
            </div>

            {/* Fila: Mesa para */}
            <div className="flex items-center justify-between py-3" style={{ borderTop: `1px solid ${B.creamDark}` }}>
              <span className="text-sm" style={{ color: B.muted }}>Mesa para</span>
              <span className="text-sm font-bold" style={{ color: B.charcoal }}>{mesa.capacidad} personas</span>
            </div>

            {/* Fila: Consumo */}
            <div className="flex items-center justify-between py-3" style={{ borderTop: `1px solid ${B.creamDark}` }}>
              <span className="text-sm" style={{ color: B.muted }}>Consumo</span>
              <span className="text-sm font-bold" style={{ color: B.charcoal }}>{consumo}</span>
            </div>

            {/* Fila extra: mozo si ocupada */}
            {estado === 'ocupada' && mesa.mozo && (
              <div className="flex items-center justify-between py-3" style={{ borderTop: `1px solid ${B.creamDark}` }}>
                <span className="text-sm" style={{ color: B.muted }}>Mozo</span>
                <span className="text-sm font-semibold" style={{ color: B.charcoal }}>{mesa.mozo}</span>
              </div>
            )}

            {/* Fila extra: hora si ocupada */}
            {estado === 'ocupada' && mesa.pedido_inicio && (
              <div className="flex items-center justify-between py-3" style={{ borderTop: `1px solid ${B.creamDark}` }}>
                <span className="text-sm" style={{ color: B.muted }}>Desde</span>
                <span className="text-sm font-semibold" style={{ color: B.charcoal }}>
                  {new Date(mesa.pedido_inicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  {mesa.minutos_ocupada != null && ` · ${mesa.minutos_ocupada} min`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Submenú cambiar estado (desplegable) */}
        {mostrarCambiarEstado && (
          <div className="mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: B.cream, border: `1px solid ${B.creamDark}` }}>
            <div className="p-3 space-y-1">
              {(Object.entries(ESTADOS) as [EstadoMesa, EstadoConfig][]).map(([key, val]) => {
                const esActual = estado === key;
                return (
                  <button key={key}
                    onClick={() => { if (!esActual) { onCambiarEstado(mesa.id, key); setMostrarCambiarEstado(false); } }}
                    disabled={cambiando || esActual}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: esActual ? val.bg : 'transparent',
                      color:      esActual ? val.color : B.charcoal,
                      border:     `1px solid ${esActual ? val.color : 'transparent'}`,
                      cursor:     esActual ? 'default' : cambiando ? 'not-allowed' : 'pointer',
                      opacity:    cambiando && !esActual ? 0.5 : 1,
                    }}>
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
          {/* Abrir Comanda */}
          <button
            onClick={() => setModalComanda(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-1 justify-center transition-opacity"
            style={{ background: '#7C3AED', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <CheckCircle className="w-4 h-4" />
            Abrir Comanda
          </button>

          {/* Cambiar Estado */}
          <button
            onClick={() => setMostrarCambiarEstado(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
            <Users className="w-4 h-4" />
            Cambiar Estado
            <span style={{ fontSize: 10 }}>{mostrarCambiarEstado ? '▲' : '▼'}</span>
          </button>

          {/* Ver Cuenta */}
          <button
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}
            onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
            onMouseLeave={e => e.currentTarget.style.background = B.cream}>
            <Receipt className="w-4 h-4" />
            Ver Cuenta
          </button>

          {/* Cancelar Mesa */}
          <button
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity"
            style={{ background: '#EF4444', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <X className="w-4 h-4" />
            Cancelar Mesa
          </button>
        </div>
      </div>
    </div>

    {/* Modal cerrar cuenta */}
    {modalComanda && (
      <ModalCerrarCuenta mesa={mesa} onClose={() => setModalComanda(false)} />
    )}
  </>;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function MesasView() {
  const { mesas, isLoading, refetchMesas } = useGlobalData();
  const [selected,   setSelected]   = useState<MesaRow | null>(null);
  const [cambiando,  setCambiando]  = useState(false);
  const [modalNueva, setModalNueva] = useState(false);

  const zonas  = useMemo(() => [...new Set(mesas.map(m => m.zona))].sort(), [mesas]);
  const counts = useMemo(() =>
    (Object.keys(ESTADOS) as EstadoMesa[]).reduce(
      (acc, k) => ({ ...acc, [k]: mesas.filter(m => m.estado === k).length }),
      {} as Record<EstadoMesa, number>,
    ), [mesas]);

  const handleCambiarEstado = async (id: string, nuevoEstado: EstadoMesa) => {
    if (!selected || selected.estado === nuevoEstado || cambiando) return;
    setCambiando(true);

    try {
      // 1. Actualizar en BD — sin await en refetch, el Realtime lo hace solo
      await actualizarEstadoMesa(id, nuevoEstado);

      // 2. Si el nuevo estado NO es "ocupada" → cerrar modal inmediatamente
      if (ESTADOS_CIERRAN_MODAL.includes(nuevoEstado)) {
        setSelected(null);
      } else {
        // Si es "ocupada" → mantener modal abierto con estado actualizado
        setSelected(prev => prev ? { ...prev, estado: nuevoEstado } : null);
      }

      // 3. Refetch en segundo plano para sincronizar el resto de datos
      //    (no bloqueamos la UI con await)
      refetchMesas().catch(console.error);

    } catch (e) {
      console.error('Error al cambiar estado:', e);
      // Forzar refetch para revertir cualquier estado inconsistente
      refetchMesas().catch(console.error);
    } finally {
      setCambiando(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Mesas" subtitle="Gestión del espacio del restaurante"
        action={<Btn onClick={() => setModalNueva(true)}><Plus className="w-4 h-4" />Nueva Mesa</Btn>} />

      {/* Resumen de estados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(Object.entries(ESTADOS) as [EstadoMesa, EstadoConfig][]).map(([key, val]) => (
          <div key={key} className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: val.bg, border: `1px solid ${val.color}25` }}>
            <val.icon className="w-5 h-5 shrink-0" style={{ color: val.color }} />
            <div>
              <p className="text-xs" style={{ color: val.color }}>{val.label}</p>
              <p className="text-2xl font-bold" style={{ color: B.charcoal }}>{counts[key]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Zonas */}
      {zonas.map(zona => (
        <div key={zona} className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: B.charcoal }}>
            <div className="w-1 h-4 rounded-full shrink-0" style={{ background: B.gold }} />
            {zona}
            <span className="text-xs font-normal" style={{ color: B.muted }}>
              · {mesas.filter(m => m.zona === zona).length} mesas
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {mesas.filter(m => m.zona === zona).map(mesa => (
              <MesaCard key={mesa.id} mesa={mesa as MesaRow} onClick={setSelected} />
            ))}
          </div>
        </div>
      ))}

      {mesas.length === 0 && (
        <div className="py-20 text-center text-sm" style={{ color: B.muted }}>
          No hay mesas configuradas
        </div>
      )}

      {selected && (
        <MesaModal mesa={selected} onClose={() => setSelected(null)}
          onCambiarEstado={handleCambiarEstado} cambiando={cambiando} />
      )}

      {modalNueva && (
        <ModalNuevaMesa onClose={() => setModalNueva(false)}
          onSaved={() => { setModalNueva(false); refetchMesas(); }} />
      )}
    </div>
  );
}
