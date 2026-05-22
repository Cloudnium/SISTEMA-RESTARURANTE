// componentes/mesas/MesasView.tsx
'use client';

import React, { useState, useMemo, useEffect, useCallback, startTransition } from 'react';
import {
  Plus, Users, Clock, CheckCircle, CircleCheck,
  UtensilsCrossed, Sparkles, CalendarClock, Loader2, X, Receipt,
  ShoppingCart, Tag, AlertTriangle, Banknote, CreditCard, Smartphone,
  Search, UserPlus, FileText, Building2, StickyNote,
  Package, RefreshCw, UserCircle,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn } from '@/components/ui';

import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  actualizarEstadoMesa, crearMesa,
  getPedidoActivoMesa, crearVenta,
  crearCliente,
} from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';
import type {
  EstadoMesa, Mesa, Pedido, PedidoItem,
  Cliente, TipoComprobante, MetodoPago,
  CrearVentaPayload, CartItem, TipoCliente,
} from '@/lib/supabase/types';
import Image from 'next/image';

// ─── Tipos locales ────────────────────────────────────────────────────────────

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

const ESTADOS_CIERRAN_MODAL: EstadoMesa[] = ['disponible', 'limpieza', 'reservada'];

type MesaRow = Mesa & {
  pedido_id?: string | null;
  pedido_total?: number | null;
  pedido_inicio?: string | null;
  minutos_ocupada?: number | null;
  mozo?: string | null;
};

const METODOS_PAGO: { id: MetodoPago; label: string; icon: React.ElementType }[] = [
  { id: 'efectivo',      label: 'Efectivo',  icon: Banknote   },
  { id: 'tarjeta',       label: 'Tarjeta',   icon: CreditCard },
  { id: 'yape',          label: 'Yape',      icon: Smartphone },
  { id: 'plin',          label: 'Plin',      icon: Smartphone },
  { id: 'transferencia', label: 'Transfer',  icon: CreditCard },
  { id: 'izipay',        label: 'Izipay',    icon: CreditCard },
];

const COMPROBANTES: { id: TipoComprobante; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'boleta',     label: 'Boleta',       icon: Receipt,    desc: 'Consumidor final' },
  { id: 'factura',    label: 'Factura',      icon: Building2,  desc: 'Con RUC empresa'  },
  { id: 'nota_venta', label: 'Nota de Venta', icon: StickyNote, desc: 'Sin IGV separado' },
];

// ─── Utilidades ───────────────────────────────────────────────────────────────

function fmtSoles(n: number | null | undefined) {
  return `S/ ${(n ?? 0).toFixed(2)}`;
}

// ─── IlustracionMesa ──────────────────────────────────────────────────────────

function IlustracionMesa({ estado }: { estado: EstadoMesa }) {
  return (
    <Image
      src={ICONOS[estado]} alt="" width={65} height={65} aria-hidden="true"
      className="w-full h-full object-contain"
      style={{ filter: COLOR_FILTERS[estado] }}
    />
  );
}

// ─── MesaCard ─────────────────────────────────────────────────────────────────

function MesaCard({ mesa, onClick }: { mesa: MesaRow; onClick: (m: MesaRow) => void }) {
  const estado: EstadoMesa = mesa.estado ?? 'disponible';
  const est = ESTADOS[estado];
  const pedidoTotal = mesa.pedido_total != null ? fmtSoles(mesa.pedido_total) : null;
  const hora = mesa.pedido_inicio
    ? new Date(mesa.pedido_inicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <button
      onClick={() => onClick(mesa)}
      className="rounded-2xl p-4 text-left transition-all duration-200 relative overflow-hidden flex flex-row items-stretch"
      style={{ background: est.bg, border: `1.5px solid ${est.color}30`, minHeight: 130 }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px ${est.color}30`; e.currentTarget.style.borderColor = est.color; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = `${est.color}30`; }}
    >
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
            {mesa.mozo    && <p className="text-xs font-semibold truncate" style={{ color: B.charcoal }}>{mesa.mozo}</p>}
            {pedidoTotal  && <p className="text-xs font-bold" style={{ color: est.color }}>{pedidoTotal}</p>}
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
        <span
          className="pointer-events-auto flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full"
          style={{ background: `${est.color}18`, color: est.color, border: `1px solid ${est.color}30` }}
        >
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

// ─── ModalNuevaMesa ───────────────────────────────────────────────────────────

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
        numero:    numero.trim(),
        nombre:    nombre.trim() || `Mesa ${numero.trim()}`,
        zona:      zona.trim(),
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md shadow-2xl"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
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
              <input
                type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Capacidad</label>
            <input
              type="number" min="1" max="20" value={capacidad} onChange={e => setCapacidad(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}
            />
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

// ─── ModalRegistrarCliente ────────────────────────────────────────────────────
// Modal independiente igual al de ClientesView, para registrar un cliente nuevo
// desde la comanda sin salir del flujo de pago.

interface ModalRegistrarClienteProps {
  tipoComprobante: TipoComprobante;
  onClose: () => void;
  onRegistrado: (c: Cliente) => void;
}

interface FormState {
  tipo: TipoCliente; nombre: string; documento: string;
  telefono: string; email: string; direccion: string;
}
const FORM_VACIO: FormState = {
  tipo: 'persona', nombre: '', documento: '',
  telefono: '', email: '', direccion: '',
};

function ModalRegistrarCliente({ tipoComprobante, onClose, onRegistrado }: ModalRegistrarClienteProps) {
  const tipoForzado: TipoCliente = tipoComprobante === 'factura' ? 'empresa' : 'persona';
  const [form,      setForm]      = useState<FormState>({ ...FORM_VACIO, tipo: tipoForzado });
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const inp: React.CSSProperties = {
    background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (tipoComprobante === 'factura' && !form.documento.trim()) {
      setError('El RUC es obligatorio para factura'); return;
    }
    setGuardando(true); setError('');
    try {
      const nuevo = await crearCliente({
        tipo:             form.tipo,
        nombre:           form.nombre.trim(),
        dni:              form.tipo === 'persona' ? (form.documento.trim() || null) : null,
        ruc:              form.tipo === 'empresa' ? (form.documento.trim() || null) : null,
        telefono:         form.telefono.trim() || null,
        email:            form.email.trim() || null,
        direccion:        form.direccion.trim() || null,
        fecha_nacimiento: null,
        activo:           true,
        dni_extranjero:   null,
      });
      onRegistrado(nuevo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar cliente');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4"
      style={{ background: 'rgba(20,20,30,0.75)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md shadow-2xl"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>
            {tipoForzado === 'empresa' ? 'Registrar Empresa' : 'Registrar Cliente'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — mismo layout que ClientesView */}
        <div className="p-6 space-y-3">
          {/* Selector tipo (solo visual si es factura, ya forzado) */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Tipo</label>
            <div className="flex gap-2">
              {(['persona', 'empresa'] as TipoCliente[]).map(t => {
                const bloqueado = tipoComprobante === 'factura'; // para factura solo empresa
                const activo = form.tipo === t;
                return (
                  <button key={t}
                    onClick={() => { if (!bloqueado) setForm(f => ({ ...f, tipo: t })); }}
                    disabled={bloqueado && !activo}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                    style={activo
                      ? { background: B.charcoal, color: B.cream }
                      : { background: B.cream, color: B.charcoal, opacity: bloqueado ? 0.4 : 1 }}>
                    {t === 'persona' ? <UserCircle className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    {t === 'persona' ? 'Persona' : 'Empresa'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campos — idénticos a ClientesView */}
          {[
            {
              key: 'nombre',
              label: form.tipo === 'persona' ? 'Nombre completo' : 'Razón social',
              ph:    form.tipo === 'persona' ? 'Juan Pérez' : 'Mi Empresa SAC',
            },
            {
              key: 'documento',
              label: form.tipo === 'persona' ? 'DNI' : 'RUC',
              ph:    form.tipo === 'persona' ? '12345678' : '20123456789',
            },
            { key: 'telefono',  label: 'Teléfono',  ph: '987654321' },
            { key: 'email',     label: 'Email',     ph: 'correo@ejemplo.com' },
            { key: 'direccion', label: 'Dirección', ph: 'Av. Principal 123' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>{label}</label>
              <input
                type="text"
                value={form[key as keyof FormState]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inp}
              />
            </div>
          ))}

          {error && (
            <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}>
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            {tipoForzado === 'empresa' ? 'Registrar empresa' : 'Registrar cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SelectorCliente ──────────────────────────────────────────────────────────
// Reemplaza BuscadorCliente: muestra el cliente seleccionado o un buscador
// simple con botón para abrir el modal de registro.

const CLIENTE_GENERAL: Cliente = {
  id:                '__general__',
  tipo:              'persona',
  nombre:            'Cliente General',
  ruc:               null,
  dni:               null,
  telefono:          null,
  email:             null,
  direccion:         null,
  fecha_nacimiento:  null,
  puntos_acumulados: 0,
  activo:            true,
  created_at:        '',
  updated_at:        '',
  dni_extranjero:    null,
};

interface SelectorClienteProps {
  clienteSeleccionado: Cliente | null;
  onSeleccionar: (c: Cliente | null) => void;
  tipoComprobante: TipoComprobante;
  onAbrirRegistro: () => void;
}

function SelectorCliente({
  clienteSeleccionado, onSeleccionar, tipoComprobante, onAbrirRegistro,
}: SelectorClienteProps) {
  const [query,        setQuery]        = useState('');
  const [cargando,     setCargando]     = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);

  const { clientes: todosClientes } = useGlobalData();

  // Búsqueda local derivada — sin useEffect, sin setState síncrono
  const resultados = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return todosClientes
      .filter(c =>
        c.nombre.toLowerCase().includes(lower) ||
        (c.dni ?? '').includes(lower) ||
        (c.ruc ?? '').includes(lower)
      )
      .slice(0, 8);
  }, [query, todosClientes]);

  const mostrarResultados = mostrarLista && query.trim().length > 0;

  const inp: React.CSSProperties = {
    background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
  };

  // ── Cliente ya seleccionado ──
  if (clienteSeleccionado) {
    const esGeneral = clienteSeleccionado.id === '__general__';
    return (
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: B.cream, border: `1px solid ${B.creamDark}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {esGeneral
            ? <UserCircle className="w-4 h-4 shrink-0" style={{ color: B.muted }} />
            : <Users      className="w-4 h-4 shrink-0" style={{ color: B.green }} />
          }
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: esGeneral ? B.muted : B.charcoal }}>
              {clienteSeleccionado.nombre}
            </p>
            {!esGeneral && (
              <p className="text-xs" style={{ color: B.muted }}>
                {clienteSeleccionado.ruc  ? `RUC: ${clienteSeleccionado.ruc}`
                  : clienteSeleccionado.dni ? `DNI: ${clienteSeleccionado.dni}`
                  : 'Sin documento'}
              </p>
            )}
          </div>
        </div>
        {/* ✅ X → limpia selección para poder cambiar cliente */}
        <button
          onClick={() => onSeleccionar(null)}
          className="p-1.5 rounded-lg shrink-0 ml-2"
          style={{ color: B.muted }}
          onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Cambiar cliente"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── Sin cliente seleccionado: buscador + botón registro ──
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={tipoComprobante === 'factura' ? 'Buscar por nombre o RUC...' : 'Buscar por nombre o DNI...'}
          className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none"
          style={inp}
          onFocus={() => query.trim() && setMostrarLista(true)}
          onBlur={() => setTimeout(() => setMostrarLista(false), 150)}
        />
        {cargando && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: B.muted }} />
        )}

        {mostrarResultados && resultados.length > 0 && (
          <div
            className="absolute z-20 w-full mt-1 rounded-xl shadow-lg overflow-hidden"
            style={{ background: B.white, border: `1px solid ${B.creamDark}` }}
          >
            {resultados.map(c => (
              <button
                key={c.id}
                onMouseDown={() => { onSeleccionar(c); setQuery(''); setMostrarLista(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm"
                style={{ color: B.charcoal }}
                onMouseEnter={e => e.currentTarget.style.background = B.cream}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Users className="w-4 h-4 shrink-0" style={{ color: B.muted }} />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.nombre}</p>
                  <p className="text-[10px]" style={{ color: B.muted }}>
                    {c.ruc ? `RUC: ${c.ruc}` : c.dni ? `DNI: ${c.dni}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {mostrarResultados && resultados.length === 0 && (
          <div
            className="absolute z-20 w-full mt-1 rounded-xl px-4 py-3 text-sm"
            style={{ background: B.white, border: `1px solid ${B.creamDark}`, color: B.muted }}
          >
            Sin resultados para &ldquo;{query}&rdquo;
          </div>
        )}
      </div>

      {/* Botón abrir modal de registro */}
      <button
        onClick={onAbrirRegistro}
        className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl"
        style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}
        onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
        onMouseLeave={e => e.currentTarget.style.background = B.cream}
      >
        <UserPlus className="w-3.5 h-3.5" />
        Nuevo cliente
      </button>
    </div>
  );
}

// ─── ModalComanda ─────────────────────────────────────────────────────────────

interface ModalComandaProps {
  mesa: MesaRow;
  onClose: () => void;
  onPagado: () => void;
  usuarioId: string;
  cajaId?: string;
}

function ModalComanda({ mesa, onClose, onPagado, usuarioId, cajaId }: ModalComandaProps) {
  const { refetchClientes } = useGlobalData();

  const [pedido,          setPedido]          = useState<Pedido | null>(null);
  const [cargando,        setCargando]        = useState(true);
  const [procesando,      setProcesando]      = useState(false);
  const [error,           setError]           = useState('');
  const [modalRegistro,   setModalRegistro]   = useState(false);

  const [tipoComp,   setTipoComp]   = useState<TipoComprobante>('boleta');
  // null = mostrar buscador; CLIENTE_GENERAL = sin cliente específico
  const [cliente,    setCliente]    = useState<Cliente | null>(CLIENTE_GENERAL);

  const [descuento,  setDescuento]  = useState('');
  const [multa,      setMulta]      = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [efectivo,   setEfectivo]   = useState('');

  // ✅ CORREGIDO: cargarPedido con startTransition para evitar setState síncrono en effect
  const cargarPedido = useCallback(() => {
    startTransition(async () => {
      try {
        const p = await getPedidoActivoMesa(mesa.id);
        setPedido(p);
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    });
  }, [mesa.id]);

  // Carga inicial
  useEffect(() => {
    cargarPedido();
  }, [cargarPedido]);

  // Realtime subscription separado
  useEffect(() => {
    const channel = supabase
      .channel(`comanda-mesa-${mesa.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, () => cargarPedido())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `mesa_id=eq.${mesa.id}` }, () => cargarPedido())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mesa.id, cargarPedido]);

  // Cambio de tipo de comprobante → ajustar cliente sin useEffect
  const handleTipoComp = (nuevo: TipoComprobante) => {
    setTipoComp(nuevo);
    if (nuevo === 'factura') {
      // Factura requiere cliente real con RUC → limpiar selección
      setCliente(null);
    } else if (!cliente) {
      // Volver al general si no hay cliente seleccionado
      setCliente(CLIENTE_GENERAL);
    }
  };

  // Cuando se registra un cliente nuevo desde el modal
  const handleClienteRegistrado = (c: Cliente) => {
    setCliente(c);
    setModalRegistro(false);
    refetchClientes(); // actualizar lista global
  };

  // Cuando se limpia la selección (X)
  const handleLimpiarCliente = () => {
    setCliente(null);
  };

  const items: PedidoItem[] = pedido?.items ?? [];
  const subtotal    = items.reduce((s, i) => s + i.subtotal, 0);
  const descVal     = parseFloat(descuento) || 0;
  const multaVal    = parseFloat(multa) || 0;
  const totalSinIgv = Math.max(0, subtotal - descVal + multaVal);
  const igv         = tipoComp !== 'nota_venta' ? totalSinIgv * 0.18 : 0;
  const total       = totalSinIgv + igv;
  const vuelto      = metodoPago === 'efectivo'
    ? Math.max(0, (parseFloat(efectivo) || 0) - total) : null;

  const confirmarPago = async () => {
    if (tipoComp === 'factura' && (!cliente || cliente.id === '__general__')) {
      setError('Para factura debes seleccionar o registrar un cliente con RUC.');
      return;
    }
    setProcesando(true); setError('');

    const cartItems: CartItem[] = items.map(i => ({
      id:           i.producto_id,
      nombre:       i.producto?.nombre ?? '',
      precio:       i.precio_unitario,
      cantidad:     i.cantidad,
      stock_tienda: 0,
    }));

    const payload: CrearVentaPayload = {
      items:            cartItems,
      tipo_comprobante: tipoComp,
      metodo_pago:      metodoPago,
      cliente_id:       (cliente && cliente.id !== '__general__') ? cliente.id : undefined,
      caja_id:          cajaId ?? undefined,
      mesa_id:          mesa.id,
      monto_recibido:   metodoPago === 'efectivo' ? (parseFloat(efectivo) || undefined) : undefined,
      descuento_monto:  descVal > 0 ? descVal : undefined,
      notas:            multaVal > 0 ? `Multa por daños: S/ ${multaVal.toFixed(2)}` : undefined,
    };

    try {
      await crearVenta(payload, usuarioId);
      onPagado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el pago');
    } finally {
      setProcesando(false);
    }
  };

  const col1 = items.filter((_, i) => i % 2 === 0);
  const col2 = items.filter((_, i) => i % 2 === 1);

  return (
    <>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4"
        style={{ background: 'rgba(20,20,30,0.70)', backdropFilter: 'blur(5px)' }}
        onClick={onClose}
      >
        <div
          className="rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col"
          style={{ background: B.white, maxHeight: '94vh', maxWidth: 680 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 shrink-0"
            style={{ borderBottom: `1px solid ${B.cream}` }}>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ color: B.charcoal }}>
              <Receipt className="w-5 h-5 shrink-0" style={{ color: '#7C3AED' }} />
              Comanda — {mesa.nombre ?? `Mesa ${mesa.numero}`}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={cargarPedido} className="p-1.5 rounded-lg" style={{ color: B.muted }} title="Actualizar"
                onMouseEnter={e => e.currentTarget.style.background = B.cream}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
                onMouseEnter={e => e.currentTarget.style.background = B.cream}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4">
            {cargando && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: B.green }} />
              </div>
            )}

            {!cargando && !pedido && (
              <div className="flex flex-col items-center gap-3 py-10 rounded-2xl" style={{ background: B.cream }}>
                <Package className="w-10 h-10" style={{ color: B.muted }} />
                <p className="text-sm font-semibold" style={{ color: B.muted }}>No hay pedido activo en esta mesa</p>
                <p className="text-xs" style={{ color: B.muted }}>Los productos aparecerán aquí cuando se registre un pedido</p>
              </div>
            )}

            {!cargando && pedido && (
              <>
                {/* Tipo comprobante */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>Tipo de comprobante</p>
                  <div className="grid grid-cols-3 gap-2">
                    {COMPROBANTES.map(c => {
                      const activo = tipoComp === c.id;
                      return (
                        <button key={c.id}
                          onClick={() => handleTipoComp(c.id)}
                          className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: activo ? '#7C3AED' : B.cream,
                            color: activo ? '#fff' : B.charcoal,
                            border: `1px solid ${activo ? '#7C3AED' : B.creamDark}`,
                          }}>
                          <c.icon className="w-4 h-4" />
                          <span className="font-bold">{c.label}</span>
                          <span className="text-[9px] opacity-70">{c.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cliente */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: B.muted }}>
                    <Users className="w-3.5 h-3.5" />
                    {tipoComp === 'factura' ? 'Cliente / Empresa (obligatorio)' : 'Cliente (opcional)'}
                  </p>
                  <SelectorCliente
                    clienteSeleccionado={cliente}
                    onSeleccionar={c => c ? setCliente(c) : handleLimpiarCliente()}
                    tipoComprobante={tipoComp}
                    onAbrirRegistro={() => setModalRegistro(true)}
                  />
                </div>

                {/* Productos */}
                <div className="rounded-2xl p-4" style={{ background: B.cream }}>
                  <p className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: B.charcoal }}>
                    <ShoppingCart className="w-4 h-4" />
                    Productos del pedido
                    <span className="ml-auto font-normal text-[10px]" style={{ color: B.muted }}>
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                  </p>
                  {items.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: B.muted }}>Sin productos registrados</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                      {[col1, col2].map((col, ci) => (
                        <div key={ci} className="space-y-1.5">
                          {col.map(p => (
                            <div key={p.id} className="flex items-baseline justify-between text-sm gap-2">
                              <span className="min-w-0 truncate" style={{ color: B.charcoal }}>
                                <span className="font-bold mr-1">{p.cantidad}×</span>
                                {p.producto?.nombre ?? 'Producto'}
                              </span>
                              <span className="font-semibold shrink-0" style={{ color: B.charcoal }}>
                                {fmtSoles(p.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Descuento */}
                <div className="flex flex-wrap items-center gap-3">
                  <button className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl shrink-0"
                    style={{ color: '#16a34a', background: '#dcfce7', border: '1px solid #86efac' }}>
                    <Tag className="w-4 h-4" />Descuento (S/.)
                  </button>
                  <input type="number" min="0" placeholder="0.00" value={descuento}
                    onChange={e => setDescuento(e.target.value)}
                    className="w-24 px-3 py-2 rounded-xl text-sm outline-none text-right"
                    style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
                  <div className="ml-auto text-right">
                    <span className="text-xs" style={{ color: B.muted }}>Subtotal: </span>
                    <span className="font-bold" style={{ color: B.charcoal }}>{fmtSoles(subtotal)}</span>
                  </div>
                </div>

                {/* Multa */}
                <div className="flex flex-wrap items-center gap-3">
                  <button className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl shrink-0"
                    style={{ color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d' }}>
                    <AlertTriangle className="w-4 h-4" />Multa daños (S/.)
                  </button>
                  <input type="number" min="0" placeholder="0.00" value={multa}
                    onChange={e => setMulta(e.target.value)}
                    className="w-24 px-3 py-2 rounded-xl text-sm outline-none text-right"
                    style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
                  <div className="ml-auto text-right flex flex-col items-end">
                    {tipoComp !== 'nota_venta' && (
                      <span className="text-[10px]" style={{ color: B.muted }}>IGV (18%): {fmtSoles(igv)}</span>
                    )}
                    <span className="text-xl font-black" style={{ color: '#7C3AED' }}>{fmtSoles(total)}</span>
                  </div>
                </div>

                {/* Método de pago */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>Método de pago</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {METODOS_PAGO.map(m => {
                      const activo = metodoPago === m.id;
                      return (
                        <button key={m.id} onClick={() => setMetodoPago(m.id)}
                          className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: activo ? '#7C3AED' : B.cream,
                            color: activo ? '#fff' : B.charcoal,
                            border: `1px solid ${activo ? '#7C3AED' : B.creamDark}`,
                          }}>
                          <m.icon className="w-4 h-4" />{m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Efectivo */}
                {metodoPago === 'efectivo' && (
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>Efectivo recibido (S/.)</p>
                    <input type="number" min="0" placeholder="0.00" value={efectivo}
                      onChange={e => setEfectivo(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
                    {vuelto !== null && efectivo && (
                      <p className="text-sm" style={{ color: B.muted }}>
                        Vuelto: <span className="text-xl font-black" style={{ color: '#7C3AED' }}>{fmtSoles(vuelto)}</span>
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <div className="px-4 py-3 rounded-xl text-sm flex items-start gap-2" style={{ background: '#fef0e6', color: B.terra }}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 shrink-0"
            style={{ borderTop: `1px solid ${B.cream}` }}>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
            {pedido && (
              <button onClick={confirmarPago} disabled={procesando || items.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: '#7C3AED', color: '#fff' }}>
                {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirmar Pago
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de registro de cliente — z-index mayor que la comanda */}
      {modalRegistro && (
        <ModalRegistrarCliente
          tipoComprobante={tipoComp}
          onClose={() => setModalRegistro(false)}
          onRegistrado={handleClienteRegistrado}
        />
      )}
    </>
  );
}

// ─── ModalVerCuenta ───────────────────────────────────────────────────────────

function ModalVerCuenta({ mesa, onClose }: { mesa: MesaRow; onClose: () => void }) {
  const [pedido,   setPedido]   = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);

  // ✅ CORREGIDO: también usa startTransition
  const cargar = useCallback(() => {
    startTransition(async () => {
      
      try {
        const p = await getPedidoActivoMesa(mesa.id);
        setPedido(p);
      } finally {
        setCargando(false);
      }
    });
  }, [mesa.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const channel = supabase
      .channel(`cuenta-mesa-${mesa.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `mesa_id=eq.${mesa.id}` }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mesa.id, cargar]);

  const items: PedidoItem[] = pedido?.items ?? [];
  const total = items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(20,20,30,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col"
        style={{ background: B.white, maxHeight: '88vh', maxWidth: 480 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${B.cream}` }}>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: B.charcoal }}>
            <FileText className="w-5 h-5" style={{ color: '#7C3AED' }} />
            Ver Cuenta — {mesa.nombre ?? `Mesa ${mesa.numero}`}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={cargar} className="p-1.5 rounded-lg" style={{ color: B.muted }}
              onMouseEnter={e => e.currentTarget.style.background = B.cream}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
              onMouseEnter={e => e.currentTarget.style.background = B.cream}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {cargando && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: B.green }} />
            </div>
          )}
          {!cargando && !pedido && (
            <div className="flex flex-col items-center gap-3 py-10 rounded-2xl" style={{ background: B.cream }}>
              <Package className="w-10 h-10" style={{ color: B.muted }} />
              <p className="text-sm" style={{ color: B.muted }}>Sin pedido activo en esta mesa</p>
            </div>
          )}
          {!cargando && pedido && (
            <>
              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: B.cream }}>
                <div>
                  <p className="text-xs" style={{ color: B.muted }}>Pedido iniciado</p>
                  <p className="text-sm font-semibold" style={{ color: B.charcoal }}>
                    {new Date(pedido.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {mesa.minutos_ocupada != null && (
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: B.muted }}>
                    <Clock className="w-4 h-4" />{mesa.minutos_ocupada} min
                  </div>
                )}
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${B.creamDark}` }}>
                <div className="px-4 py-3 flex items-center gap-2"
                  style={{ background: B.cream, borderBottom: `1px solid ${B.creamDark}` }}>
                  <ShoppingCart className="w-4 h-4" style={{ color: B.charcoal }} />
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: B.charcoal }}>
                    Detalle de consumo
                  </span>
                </div>
                {items.length === 0
                  ? <p className="text-xs text-center py-6" style={{ color: B.muted }}>Sin productos</p>
                  : (
                    <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                      {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm"
                          style={{ borderColor: B.creamDark }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                              style={{ background: B.cream, color: B.charcoal }}>{item.cantidad}×</span>
                            <span className="truncate" style={{ color: B.charcoal }}>
                              {item.producto?.nombre ?? 'Producto'}
                            </span>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="font-bold" style={{ color: B.charcoal }}>{fmtSoles(item.subtotal)}</p>
                            <p className="text-[10px]" style={{ color: B.muted }}>{fmtSoles(item.precio_unitario)} c/u</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                <div className="flex items-center justify-between px-4 py-4"
                  style={{ background: B.cream, borderTop: `2px solid ${B.creamDark}` }}>
                  <span className="font-black uppercase tracking-wide text-sm" style={{ color: B.charcoal }}>Total</span>
                  <span className="text-2xl font-black" style={{ color: '#7C3AED' }}>{fmtSoles(total)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 shrink-0 flex justify-end" style={{ borderTop: `1px solid ${B.cream}` }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cerrar</button>
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
  const { usuario } = useAuth();
  const estado: EstadoMesa = mesa.estado ?? 'disponible';
  const est = ESTADOS[estado];
  const [mostrarCambiarEstado, setMostrarCambiarEstado] = useState(false);
  const [modalComanda,         setModalComanda]         = useState(false);
  const [modalCuenta,          setModalCuenta]          = useState(false);

  const usuarioId = usuario?.id ?? '';
  const consumo = mesa.pedido_total != null ? fmtSoles(mesa.pedido_total) : 'S/ 0.00';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(30,30,40,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={!cambiando ? onClose : undefined}>
        <div className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          style={{ background: B.white }}
          onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${B.cream}` }}>
            <h2 className="text-xl font-bold" style={{ color: B.charcoal }}>
              {mesa.nombre ?? `Mesa ${mesa.numero}`}
              {mesa.zona ? <span className="font-normal text-base"> — {mesa.zona}</span> : null}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: B.muted }}
              onMouseEnter={e => e.currentTarget.style.background = B.cream}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
                { label: 'Estado', content: (
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{ background: est.bg, color: est.color, border: `1px solid ${est.color}40` }}>
                    <est.icon className="w-3.5 h-3.5 shrink-0" />{est.label}
                  </span>
                )},
                { label: 'Mesa para', content: <span className="text-sm font-bold" style={{ color: B.charcoal }}>{mesa.capacidad} personas</span> },
                { label: 'Consumo',   content: <span className="text-sm font-bold" style={{ color: B.charcoal }}>{consumo}</span> },
                ...(estado === 'ocupada' && mesa.mozo
                  ? [{ label: 'Mozo', content: <span className="text-sm font-semibold" style={{ color: B.charcoal }}>{mesa.mozo}</span> }]
                  : []),
                ...(estado === 'ocupada' && mesa.pedido_inicio
                  ? [{ label: 'Desde', content: (
                    <span className="text-sm font-semibold" style={{ color: B.charcoal }}>
                      {new Date(mesa.pedido_inicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      {mesa.minutos_ocupada != null && ` · ${mesa.minutos_ocupada} min`}
                    </span>
                  )}] : []),
              ].map(({ label, content }, idx) => (
                <div key={idx} className="flex items-center justify-between py-3" style={{ borderTop: `1px solid ${B.creamDark}` }}>
                  <span className="text-sm" style={{ color: B.muted }}>{label}</span>
                  {content}
                </div>
              ))}
            </div>
          </div>

          {/* Submenú cambiar estado */}
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
                        color: esActual ? val.color : B.charcoal,
                        border: `1px solid ${esActual ? val.color : 'transparent'}`,
                        cursor: esActual ? 'default' : cambiando ? 'not-allowed' : 'pointer',
                        opacity: cambiando && !esActual ? 0.5 : 1,
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
            <button onClick={() => setModalComanda(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-1 justify-center"
              style={{ background: '#7C3AED', color: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <CheckCircle className="w-4 h-4" />Abrir Comanda
            </button>

            <button onClick={() => setMostrarCambiarEstado(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
              <Users className="w-4 h-4" />Cambiar Estado
              <span style={{ fontSize: 10 }}>{mostrarCambiarEstado ? '▲' : '▼'}</span>
            </button>

            <button onClick={() => setModalCuenta(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}
              onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
              onMouseLeave={e => e.currentTarget.style.background = B.cream}>
              <Receipt className="w-4 h-4" />Ver Cuenta
            </button>

            <button
              onClick={() => onCambiarEstado(mesa.id, 'disponible')}
              disabled={cambiando}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: '#EF4444', color: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <X className="w-4 h-4" />Cancelar Mesa
            </button>
          </div>
        </div>
      </div>

      {modalComanda && (
        <ModalComanda
          mesa={mesa}
          usuarioId={usuarioId}
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

// ─── Main export ──────────────────────────────────────────────────────────────

export default function MesasView() {
  const { mesas, isLoading, refetchMesas } = useGlobalData();
  const [selected,   setSelected]   = useState<MesaRow | null>(null);
  const [cambiando,  setCambiando]  = useState(false);
  const [modalNueva, setModalNueva] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('mesas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => refetchMesas().catch(console.error))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => refetchMesas().catch(console.error))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchMesas]);

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
      await actualizarEstadoMesa(id, nuevoEstado);
      if (ESTADOS_CIERRAN_MODAL.includes(nuevoEstado)) {
        setSelected(null);
      } else {
        setSelected(prev => prev ? { ...prev, estado: nuevoEstado } : null);
      }
      refetchMesas().catch(console.error);
    } catch (e) {
      console.error('Error al cambiar estado:', e);
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
      <PageHeader
        title="Mesas"
        subtitle="Gestión del espacio del restaurante"
        action={<Btn onClick={() => setModalNueva(true)}><Plus className="w-4 h-4" />Nueva Mesa</Btn>}
      />

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
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: B.charcoal }}>
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
        <div className="py-20 text-center text-sm" style={{ color: B.muted }}>No hay mesas configuradas</div>
      )}

      {selected && (
        <MesaModal
          mesa={selected}
          onClose={() => setSelected(null)}
          onCambiarEstado={handleCambiarEstado}
          cambiando={cambiando}
        />
      )}

      {modalNueva && (
        <ModalNuevaMesa
          onClose={() => setModalNueva(false)}
          onSaved={() => { setModalNueva(false); refetchMesas(); }}
        />
      )}
    </div>
  );
}