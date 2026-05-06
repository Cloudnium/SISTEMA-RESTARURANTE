'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus, Users, Clock, CheckCircle, CircleCheck,
  UtensilsCrossed, Sparkles, CalendarClock, Loader2, X, Receipt,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { actualizarEstadoMesa, crearMesa } from '@/lib/supabase/queries';
import type { EstadoMesa, Mesa } from '@/lib/supabase/types';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EstadoConfig {
  label: string; color: string; bg: string; icon: React.ElementType;
}

// ─── Config ───────────────────────────────────────────────────────────────────
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

// ─── Ilustración ──────────────────────────────────────────────────────────────
function IlustracionMesa({ estado }: { estado: EstadoMesa }) {
  return (
    <Image
      src={ICONOS[estado]}
      alt=""
      width={65}
      height={65}
      aria-hidden="true"
      className="w-full h-full object-contain"
      style={{ filter: COLOR_FILTERS[estado] }}
    />
  );
}
type MesaRow = Mesa & { pedido_id?: string|null; pedido_total?: number|null; pedido_inicio?: string|null; minutos_ocupada?: number|null; mozo?: string|null };
// ─── MesaCard ─────────────────────────────────────────────────────────────────
function MesaCard({ mesa, onClick }: { mesa: MesaRow; onClick: (m: MesaRow) => void }) {
  const estado: EstadoMesa = mesa.estado ?? 'disponible';
  const est = ESTADOS[estado];

  const cliente   = mesa.mozo ?? null;
  const pedidoTotal = mesa.pedido_total != null ? `S/ ${Number(mesa.pedido_total).toFixed(2)}` : null;
  const hora = mesa.pedido_inicio
    ? new Date(mesa.pedido_inicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <button onClick={() => onClick(mesa)}
      className="rounded-2xl p-4 text-left transition-all duration-200 relative overflow-hidden flex flex-row items-stretch"
      style={{ background: est.bg, border: `1.5px solid ${est.color}30`, minHeight: 130 }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px ${est.color}30`; e.currentTarget.style.borderColor = est.color; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = `${est.color}30`; }}>

      {/* Columna izquierda */}
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
            {cliente && <p className="text-xs font-semibold truncate" style={{ color: B.charcoal }}>{cliente}</p>}
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

      {/* Columna derecha */}
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
        zona: zona.trim(),
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

// ─── MesaModal ────────────────────────────────────────────────────────────────
function MesaModal({ mesa, onClose, onCambiarEstado, cambiando }: {
  mesa: MesaRow; onClose: () => void;
  onCambiarEstado: (id: string, estado: EstadoMesa) => Promise<void>;
  cambiando: boolean;
}) {
  const estado: EstadoMesa = mesa.estado ?? 'disponible';
  const est = ESTADOS[estado];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={!cambiando ? onClose : undefined}>
      <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ background: B.white }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>
              {mesa.nombre ?? `Mesa ${mesa.numero}`}
            </h2>
            <p className="text-xs" style={{ color: B.muted }}>
              {mesa.zona} · {mesa.capacidad} personas
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: est.bg, color: est.color }}>
            <est.icon className="w-3.5 h-3.5 shrink-0" />
            {est.label}
          </span>
        </div>

        {estado === 'ocupada' && mesa.pedido_total != null && (
          <div className="rounded-xl p-3 mb-4" style={{ background: B.cream }}>
            {mesa.mozo && <p className="text-sm font-bold" style={{ color: B.charcoal }}>{mesa.mozo}</p>}
            <p className="text-xl font-black mt-1" style={{ color: B.green }}>
              S/ {Number(mesa.pedido_total).toFixed(2)}
            </p>
            {mesa.pedido_inicio && (
              <p className="text-xs mt-1" style={{ color: B.muted }}>
                Desde las {new Date(mesa.pedido_inicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                {mesa.minutos_ocupada != null && ` · ${mesa.minutos_ocupada} min`}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5 mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>
            Cambiar estado
          </p>
          {(Object.entries(ESTADOS) as [EstadoMesa, EstadoConfig][]).map(([key, val]) => (
            <button key={key} onClick={() => onCambiarEstado(mesa.id, key)} disabled={cambiando}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
              style={{
                background: estado === key ? val.bg : 'transparent',
                color:      estado === key ? val.color : B.charcoal,
                border: `1px solid ${estado === key ? val.color : B.cream}`,
              }}>
              <val.icon className="w-4 h-4 shrink-0" style={{ color: val.color }} />
              {val.label}
              {estado === key && !cambiando && <CheckCircle className="w-4 h-4 ml-auto" style={{ color: val.color }} />}
              {estado === key && cambiando  && <Loader2    className="w-4 h-4 ml-auto animate-spin" style={{ color: val.color }} />}
            </button>
          ))}
        </div>

        {estado === 'ocupada' && (
          <Btn color={B.charcoal} textColor={B.cream}>
            <Receipt className="w-4 h-4" />
            Ver pedido de la mesa
          </Btn>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function MesasView() {
  const { mesas, isLoading, refetchMesas } = useGlobalData();
  const [selected,     setSelected]     = useState<MesaRow | null>(null);
  const [cambiando,    setCambiando]    = useState(false);
  const [modalNueva,   setModalNueva]   = useState(false);

  const zonas = useMemo(() => [...new Set(mesas.map(m => m.zona))].sort(), [mesas]);

  const counts = useMemo(() =>
    (Object.keys(ESTADOS) as EstadoMesa[]).reduce(
      (acc, k) => ({ ...acc, [k]: mesas.filter(m => m.estado === k).length }),
      {} as Record<EstadoMesa, number>,
    ), [mesas]);

  const handleCambiarEstado = async (id: string, nuevoEstado: EstadoMesa) => {
    if (selected?.estado === nuevoEstado) return;
    setCambiando(true);
    try {
      await actualizarEstadoMesa(id, nuevoEstado);
      await refetchMesas();
      // Actualiza el modal con el nuevo estado
      setSelected((prev: MesaRow | null) => prev ? { ...prev, estado: nuevoEstado } : null);
    } catch (e) {
      console.error(e);
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
              <MesaCard key={mesa.id} mesa={mesa} onClick={setSelected} />
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