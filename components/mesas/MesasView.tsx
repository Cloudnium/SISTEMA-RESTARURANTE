//componentes/MesasView.tsx
'use client';

import React, { useState } from 'react';
import { Plus, Users, Clock, CheckCircle, CircleCheck, UtensilsCrossed, Sparkles, CalendarClock } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn } from '@/components/ui';
import { Receipt } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type EstadoKey = 'disponible' | 'ocupada' | 'limpieza' | 'reservada';

interface EstadoConfig {
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
}

interface Mesa {
  id: string;
  zona: string;
  cap: number;
  estado: EstadoKey;
  cliente: string | null;
  hora: string | null;
  pedido: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const ESTADOS: Record<EstadoKey, EstadoConfig> = {
  disponible: { label: 'Disponible',   color: '#5C7A3E', bg: '#e8f5e2', icon: CircleCheck },
  ocupada:    { label: 'Ocupada',      color: '#D4673A', bg: '#fef0e6', icon: UtensilsCrossed },
  limpieza:   { label: 'Limpieza', color: '#C9A84C', bg: '#fdf8e6', icon: Sparkles },
  reservada:  { label: 'Reservada',   color: '#4A6FA5', bg: '#e8f0fb', icon: CalendarClock },
};

const INITIAL_MESAS: Mesa[] = [
  { id: 'M01', zona: 'Salón Principal', cap: 4, estado: 'disponible', cliente: null,            hora: null,    pedido: null },
  { id: 'M02', zona: 'Salón Principal', cap: 4, estado: 'ocupada',    cliente: 'Mesa Flores',   hora: '18:30', pedido: 'S/ 67.50' },
  { id: 'M03', zona: 'Salón Principal', cap: 2, estado: 'disponible', cliente: null,            hora: null,    pedido: null },
  { id: 'M04', zona: 'Salón Principal', cap: 6, estado: 'ocupada',    cliente: 'Familia García',hora: '19:05', pedido: 'S/ 128.00' },
  { id: 'M05', zona: 'Salón Principal', cap: 4, estado: 'limpieza',   cliente: null,            hora: '19:15', pedido: null },
  { id: 'M06', zona: 'Salón Principal', cap: 4, estado: 'disponible', cliente: null,            hora: null,    pedido: null },
  { id: 'M07', zona: 'Salón Principal', cap: 2, estado: 'reservada',  cliente: 'Reserva 20:00', hora: '20:00', pedido: null },
  { id: 'M08', zona: 'Salón Principal', cap: 8, estado: 'disponible', cliente: null,            hora: null,    pedido: null },
  { id: 'T01', zona: 'Terraza',         cap: 4, estado: 'disponible', cliente: null,            hora: null,    pedido: null },
  { id: 'T02', zona: 'Terraza',         cap: 4, estado: 'ocupada',    cliente: 'Sr. Ramírez',   hora: '18:45', pedido: 'S/ 45.00' },
  { id: 'T03', zona: 'Terraza',         cap: 2, estado: 'disponible', cliente: null,            hora: null,    pedido: null },
  { id: 'T04', zona: 'Terraza',         cap: 4, estado: 'limpieza',   cliente: null,            hora: '19:20', pedido: null },
  { id: 'T05', zona: 'Terraza',         cap: 6, estado: 'reservada',  cliente: 'Reserva 20:30', hora: '20:30', pedido: null },
  { id: 'B01', zona: 'Barra',           cap: 2, estado: 'disponible', cliente: null,            hora: null,    pedido: null },
  { id: 'B02', zona: 'Barra',           cap: 2, estado: 'ocupada',    cliente: 'Cliente',       hora: '19:00', pedido: 'S/ 18.00' },
  { id: 'B03', zona: 'Barra',           cap: 2, estado: 'disponible', cliente: null,            hora: null,    pedido: null },
];

// ─── Ilustraciones por estado (PNG desde /public/icons/) ──────────────────────
const ICONOS: Record<EstadoKey, string> = {
  disponible: '/icons/disponible.png',
  ocupada:    '/icons/ocupada.png',
  limpieza:   '/icons/limpieza.png',
  reservada:  '/icons/reservada.png',
};

// Convierte un color hex a un CSS filter que tinte la imagen
const COLOR_FILTERS: Record<EstadoKey, string> = {
  disponible: 'invert(38%) sepia(28%) saturate(600%) hue-rotate(60deg) brightness(90%)',   // verde #5C7A3E
  ocupada:    'invert(45%) sepia(60%) saturate(700%) hue-rotate(340deg) brightness(95%)',  // naranja #D4673A
  limpieza:   'invert(65%) sepia(50%) saturate(600%) hue-rotate(10deg) brightness(95%)',   // dorado #C9A84C
  reservada:  'invert(35%) sepia(40%) saturate(600%) hue-rotate(190deg) brightness(90%)',  // azul #4A6FA5
};

function IlustracionMesa({ estado }: { estado: EstadoKey }) {
  return (
    <img
      src={ICONOS[estado]}
      alt=""
      aria-hidden="true"
      className="w-full h-full object-contain"
      style={{ filter: COLOR_FILTERS[estado] }}
    />
  );
}



// ─── MesaCard ─────────────────────────────────────────────────────────────────
function MesaCard({ mesa, onClick }: { mesa: Mesa; onClick: (m: Mesa) => void }) {
  const est = ESTADOS[mesa.estado];
  return (
    <button
      onClick={() => onClick(mesa)}
      className="rounded-2xl p-4 text-left transition-all duration-200 relative overflow-hidden flex flex-row items-stretch"
      style={{ background: est.bg, border: `1.5px solid ${est.color}30`, minHeight: 130 }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 16px ${est.color}30`;
        e.currentTarget.style.borderColor = est.color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = `${est.color}30`;
      }}
    >
      {/* Columna izquierda: texto */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0 z-10">
        {/* Header: nombre + personas */}
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-black tracking-widest uppercase" style={{ color: est.color }}>
            Mesa {mesa.id}
          </p>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" style={{ color: B.muted }} />
            <span className="text-[10px]" style={{ color: B.muted }}>{mesa.cap} pers.</span>
          </div>
        </div>

        {/* Info cliente */}
        {mesa.cliente && (
          <div className="mt-auto">
            <p className="text-xs font-semibold truncate" style={{ color: B.charcoal }}>{mesa.cliente}</p>
            {mesa.pedido && <p className="text-xs font-bold" style={{ color: est.color }}>{mesa.pedido}</p>}
            {mesa.hora && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" style={{ color: B.muted }} />
                <span className="text-[10px]" style={{ color: B.muted }}>{mesa.hora}</span>
              </div>
            )}
          </div>
        )}

        {!mesa.cliente && (
          <p className="text-[10px] mt-auto" style={{ color: B.muted }}>
            {mesa.estado === 'disponible'
              ? 'Lista para atender'
              : mesa.estado === 'limpieza' && mesa.hora
                ? `Limpiando desde ${mesa.hora}`
                : ''}
          </p>
        )}
      </div>

      {/* Columna derecha: badge arriba + ilustración abajo */}
      <div className="flex flex-col items-end justify-between shrink-0 pointer-events-none" style={{ width: 65 }}>
        {/* Badge estado arriba a la derecha */}
        <span
          className="pointer-events-auto flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full"
          style={{ background: `${est.color}18`, color: est.color, border: `1px solid ${est.color}30` }}
        >
          <est.icon className="w-2.5 h-2.5 shrink-0" />
          {est.label}
        </span>

        {/* Ilustración abajo */}
        <div style={{ opacity: 0.55 }} aria-hidden="true">
          <IlustracionMesa estado={mesa.estado} />
        </div>
      </div>
    </button>
  );
}

// ─── MesaModal ────────────────────────────────────────────────────────────────
interface MesaModalProps {
  mesa: Mesa;
  onClose: () => void;
  onCambiarEstado: (id: string, estado: EstadoKey) => void;
}

function MesaModal({ mesa, onClose, onCambiarEstado }: MesaModalProps) {
  const est = ESTADOS[mesa.estado];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        style={{ background: B.white }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Mesa {mesa.id}</h2>
            <p className="text-xs" style={{ color: B.muted }}>{mesa.zona} · {mesa.cap} personas</p>
          </div>
          <span
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: est.bg, color: est.color }}
          >
            <est.icon className="w-3.5 h-3.5 shrink-0" />
            {est.label}
          </span>
        </div>

        {mesa.cliente && (
          <div className="rounded-xl p-3 mb-4" style={{ background: B.cream }}>
            <p className="text-sm font-bold" style={{ color: B.charcoal }}>{mesa.cliente}</p>
            {mesa.pedido && (
              <p className="text-xl font-black mt-1" style={{ color: B.green }}>{mesa.pedido}</p>
            )}
            {mesa.hora && (
              <p className="text-xs mt-1" style={{ color: B.muted }}>Desde las {mesa.hora}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5 mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>
            Cambiar estado
          </p>
          {(Object.entries(ESTADOS) as [EstadoKey, EstadoConfig][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => onCambiarEstado(mesa.id, key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: mesa.estado === key ? val.bg : 'transparent',
                color:      mesa.estado === key ? val.color : B.charcoal,
                border: `1px solid ${mesa.estado === key ? val.color : B.cream}`,
              }}
            >
              <val.icon className="w-4 h-4 shrink-0" style={{ color: val.color }} />
              {val.label}
              {mesa.estado === key && (
                <CheckCircle className="w-4 h-4 ml-auto" style={{ color: val.color }} />
              )}
            </button>
          ))}
        </div>

        {mesa.estado === 'ocupada' && (
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
  const [mesas, setMesas] = useState<Mesa[]>(INITIAL_MESAS);
  const [selected, setSelected] = useState<Mesa | null>(null);

  const zonas = [...new Set(mesas.map((m) => m.zona))];
  const counts = (Object.keys(ESTADOS) as EstadoKey[]).reduce(
    (acc, k) => ({ ...acc, [k]: mesas.filter((m) => m.estado === k).length }),
    {} as Record<EstadoKey, number>,
  );

  const handleCambiarEstado = (id: string, nuevoEstado: EstadoKey) => {
    setMesas((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, estado: nuevoEstado, cliente: nuevoEstado === 'disponible' ? null : m.cliente, pedido: nuevoEstado === 'disponible' ? null : m.pedido }
          : m,
      ),
    );
    setSelected((prev) => (prev ? { ...prev, estado: nuevoEstado } : null));
  };

  return (
    <div>
      <PageHeader
        title="Mesas"
        subtitle="Gestión del espacio del restaurante"
        action={<Btn><Plus className="w-4 h-4" />Nueva Mesa</Btn>}
      />

      {/* Estado summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(Object.entries(ESTADOS) as [EstadoKey, EstadoConfig][]).map(([key, val]) => (
          <div
            key={key}
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: val.bg, border: `1px solid ${val.color}25` }}
          >
            <val.icon className="w-5 h-5 shrink-0" style={{ color: val.color }} />
            <div>
              <p className="text-xs" style={{ color: val.color }}>{val.label}</p>
              <p className="text-2xl font-bold" style={{ color: B.charcoal }}>{counts[key]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Zones */}
      {zonas.map((zona) => (
        <div key={zona} className="mb-6">
          <h2
            className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: B.charcoal }}
          >
            <div className="w-1 h-4 rounded-full shrink-0" style={{ background: B.gold }} />
            {zona}
            <span className="text-xs font-normal" style={{ color: B.muted }}>
              · {mesas.filter((m) => m.zona === zona).length} mesas
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {mesas.filter((m) => m.zona === zona).map((mesa) => (
              <MesaCard key={mesa.id} mesa={mesa} onClick={setSelected} />
            ))}
          </div>
        </div>
      ))}

      {selected && (
        <MesaModal
          mesa={selected}
          onClose={() => setSelected(null)}
          onCambiarEstado={handleCambiarEstado}
        />
      )}
    </div>
  );
}