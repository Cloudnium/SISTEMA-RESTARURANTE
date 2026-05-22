'use client';

/**
 * VentaMesaView.tsx
 * Flujo de toma de pedido en mesa:
 *   1. Selecciona mesa disponible u ocupada
 *   2. Busca y agrega productos del catálogo
 *   3. Confirma → crea pedido + items en Supabase → mesa queda "ocupada"
 *
 * El PAGO se realiza después desde el módulo Mesas (ModalComanda).
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  UtensilsCrossed, Search, Plus, Minus, Trash2,
  ChevronRight, CheckCircle, Loader2, X, AlertTriangle,
  ShoppingCart, ArrowLeft, Sparkles, Package,
  Clock, Users, ClipboardList,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import {
  getMesasConPedido,
  getProductosParaVenta,
  getPedidoActivoMesa,
  crearPedido,
  agregarItemPedido,
  actualizarEstadoMesa,
} from '@/lib/supabase/queries';
import type { Producto, EstadoMesa } from '@/lib/supabase/types';

// ─── Tipos locales ────────────────────────────────────────────────────────────

type MesaConPedido = {
  id: string;
  numero: string;
  nombre: string;
  zona: string;
  capacidad: number;
  estado: EstadoMesa;
  pedido_id?: string | null;
  pedido_total?: number | null;
  pedido_inicio?: string | null;
  minutos_ocupada?: number | null;
  mozo?: string | null;
};

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  notas: string;
}

// ─── Constantes visuales ──────────────────────────────────────────────────────

const ESTADO_CFG: Record<EstadoMesa, { label: string; color: string; bg: string }> = {
  disponible: { label: 'Disponible', color: '#5C7A3E', bg: '#e8f5e2' },
  ocupada:    { label: 'Ocupada',    color: '#D4673A', bg: '#fef0e6' },
  limpieza:   { label: 'Limpieza',   color: '#C9A84C', bg: '#fdf8e6' },
  reservada:  { label: 'Reservada',  color: '#4A6FA5', bg: '#e8f0fb' },
};

// Categorías de color para badges de producto
const CAT_COLORS: string[] = [
  '#5C7A3E', '#D4673A', '#C9A84C', '#4A6FA5', '#8B5CF6', '#06B6D4', '#EC4899',
];
function catColor(cat: string) {
  let h = 0;
  for (const c of cat) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return CAT_COLORS[h % CAT_COLORS.length];
}

function fmtSoles(n: number) {
  return `S/ ${n.toFixed(2)}`;
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

// ─── Paso 1: Selector de mesa ─────────────────────────────────────────────────

interface SelectorMesaProps {
  onSelect: (mesa: MesaConPedido) => void;
}

function SelectorMesa({ onSelect }: SelectorMesaProps) {
  const [mesas,    setMesas]    = useState<MesaConPedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro,   setFiltro]   = useState<EstadoMesa | 'todas'>('todas');
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    try {
      const data = await getMesasConPedido();
      setMesas(data as MesaConPedido[]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const ch = supabase
      .channel('venta-mesa-mesas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [cargar]);

  const zonas = useMemo(() => [...new Set(mesas.map(m => m.zona))].sort(), [mesas]);

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase();
    return mesas.filter(m => {
      const matchQ = !q || m.nombre.toLowerCase().includes(q) || m.zona.toLowerCase().includes(q) || m.numero.includes(q);
      const matchF = filtro === 'todas' || m.estado === filtro;
      return matchQ && matchF;
    });
  }, [mesas, filtro, busqueda]);

  const counts = useMemo(() =>
    (['disponible', 'ocupada', 'limpieza', 'reservada'] as EstadoMesa[]).reduce(
      (acc, k) => ({ ...acc, [k]: mesas.filter(m => m.estado === k).length }),
      {} as Record<EstadoMesa, number>,
    ), [mesas]);

  if (cargando) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      {/* KPIs de estado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {(Object.entries(ESTADO_CFG) as [EstadoMesa, typeof ESTADO_CFG[EstadoMesa]][]).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setFiltro(filtro === k ? 'todas' : k)}
            className="rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition-all"
            style={{
              background: filtro === k ? v.color : v.bg,
              border: `1.5px solid ${filtro === k ? v.color : `${v.color}25`}`,
            }}
          >
            <div>
              <p className="text-xs font-semibold" style={{ color: filtro === k ? '#fff' : v.color }}>{v.label}</p>
              <p className="text-2xl font-black" style={{ color: filtro === k ? '#fff' : B.charcoal }}>{counts[k]}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar mesa por nombre, número o zona..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: B.white, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
        />
      </div>

      {/* Grid por zonas */}
      {zonas.map(zona => {
        const items = filtradas.filter(m => m.zona === zona);
        if (items.length === 0) return null;
        return (
          <div key={zona} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full" style={{ background: B.gold }} />
              <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: B.charcoal }}>{zona}</h2>
              <span className="text-xs" style={{ color: B.muted }}>· {items.length} mesa{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {items.map(mesa => {
                const cfg = ESTADO_CFG[mesa.estado ?? 'disponible'];
                const bloqueada = mesa.estado === 'limpieza' || mesa.estado === 'reservada';
                return (
                  <button
                    key={mesa.id}
                    onClick={() => !bloqueada && onSelect(mesa)}
                    disabled={bloqueada}
                    className="rounded-2xl p-4 text-left transition-all duration-200 relative overflow-hidden"
                    style={{
                      background: cfg.bg,
                      border: `1.5px solid ${cfg.color}30`,
                      minHeight: 120,
                      opacity: bloqueada ? 0.5 : 1,
                      cursor: bloqueada ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={e => {
                      if (!bloqueada) {
                        e.currentTarget.style.boxShadow = `0 4px 20px ${cfg.color}35`;
                        e.currentTarget.style.borderColor = cfg.color;
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = `${cfg.color}30`;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Badge estado */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
                      >
                        {cfg.label}
                      </span>
                      {!bloqueada && (
                        <ChevronRight className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      )}
                    </div>

                    {/* Nombre */}
                    <p className="text-sm font-black tracking-wide" style={{ color: cfg.color }}>
                      {mesa.nombre ?? `Mesa ${mesa.numero}`}
                    </p>

                    {/* Capacidad */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3" style={{ color: B.muted }} />
                      <span className="text-[10px]" style={{ color: B.muted }}>{mesa.capacidad} pers.</span>
                    </div>

                    {/* Info si ocupada */}
                    {mesa.estado === 'ocupada' && (
                      <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${cfg.color}20` }}>
                        {mesa.pedido_total != null && (
                          <p className="text-xs font-bold" style={{ color: cfg.color }}>
                            {fmtSoles(mesa.pedido_total)}
                          </p>
                        )}
                        {mesa.pedido_inicio && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" style={{ color: B.muted }} />
                            <span className="text-[10px]" style={{ color: B.muted }}>
                              {fmtHora(mesa.pedido_inicio)}
                              {mesa.minutos_ocupada != null && ` · ${mesa.minutos_ocupada}min`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtradas.length === 0 && (
        <div className="py-20 text-center" style={{ color: B.muted }}>
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay mesas con ese filtro</p>
        </div>
      )}
    </div>
  );
}

// ─── Paso 2: Toma de pedido ───────────────────────────────────────────────────

interface TomaPedidoProps {
  mesa: MesaConPedido;
  onVolver: () => void;
  onConfirmado: () => void;
}

function TomaPedido({ mesa, onVolver, onConfirmado }: TomaPedidoProps) {
  const { usuario } = useAuth();

  // Productos catálogo
  const [productos,   setProductos]  = useState<Producto[]>([]);
  const [cargProd,    setCargProd]   = useState(true);
  const [busqueda,    setBusqueda]   = useState('');
  const [categoria,   setCategoria]  = useState('Todas');

  // Carrito
  const [carrito,     setCarrito]    = useState<ItemCarrito[]>([]);

  // Pedido existente (si mesa ya ocupada)
  const [pedidoId,    setPedidoId]   = useState<string | null>(null);
  const [cargPedido,  setCargPedido] = useState(true);

  // UI
  const [notas,       setNotas]      = useState<Record<string, string>>({});
  const [confirmando, setConfirmando]= useState(false);
  const [error,       setError]      = useState('');
  const [panelCarrito, setPanelCarrito] = useState(false); // mobile toggle

  // ── Cargar pedido existente ──
  useEffect(() => {
    (async () => {
      if (mesa.estado === 'ocupada') {
        try {
          const p = await getPedidoActivoMesa(mesa.id);
          if (p) setPedidoId(p.id);
        } finally {
          setCargPedido(false);
        }
      } else {
        setCargPedido(false);
      }
    })();
  }, [mesa]);

  // ── Cargar productos catálogo ──
  useEffect(() => {
    (async () => {
      try {
        const data = await getProductosParaVenta();
        setProductos(data);
      } finally {
        setCargProd(false);
      }
    })();
  }, []);

  // ── Categorías únicas ──
  const categorias = useMemo(() => {
    const cats = [...new Set(productos.map(p => p.categoria))].sort();
    return ['Todas', ...cats];
  }, [productos]);

  // ── Productos filtrados ──
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return productos.filter(p => {
      const matchQ = !q || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q);
      const matchC = categoria === 'Todas' || p.categoria === categoria;
      return matchQ && matchC;
    });
  }, [productos, busqueda, categoria]);

  // ── Totales carrito ──
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);
  const subtotal   = carrito.reduce((s, i) => s + i.cantidad * i.producto.precio, 0);

  // ── Acciones carrito ──
  const agregarAlCarrito = (producto: Producto) => {
    setCarrito(prev => {
      const idx = prev.findIndex(i => i.producto.id === producto.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      return [...prev, { producto, cantidad: 1, notas: '' }];
    });
  };

  const cambiarCantidad = (productoId: string, delta: number) => {
    setCarrito(prev => prev
      .map(i => i.producto.id === productoId ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i)
      .filter(i => i.cantidad > 0)
    );
  };

  const quitarDelCarrito = (productoId: string) => {
    setCarrito(prev => prev.filter(i => i.producto.id !== productoId));
  };

  const cantidadEnCarrito = (productoId: string) =>
    carrito.find(i => i.producto.id === productoId)?.cantidad ?? 0;

  // ── Confirmar pedido ──
  const confirmarPedido = async () => {
    if (carrito.length === 0) { setError('Agrega al menos un producto al pedido'); return; }
    if (!usuario) { setError('No se encontró el usuario activo'); return; }
    setConfirmando(true); setError('');

    try {
      // 1. Obtener o crear pedido
      let idPedido = pedidoId;
      if (!idPedido) {
        const nuevoPedido = await crearPedido(mesa.id, usuario.id);
        idPedido = nuevoPedido.id;
        setPedidoId(idPedido);
      }

      // 2. Agregar cada item
      await Promise.all(
        carrito.map(item =>
          agregarItemPedido(
            idPedido!,
            item.producto.id,
            item.cantidad,
            item.producto.precio,
            notas[item.producto.id] || undefined,
          )
        )
      );

      // 3. Si no estaba ocupada, ya la marcó crearPedido — pero si ya estaba ocupada
      //    y sólo añadimos más items, nos aseguramos igualmente:
      if (mesa.estado !== 'ocupada') {
        await actualizarEstadoMesa(mesa.id, 'ocupada');
      }

      onConfirmado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al confirmar el pedido');
    } finally {
      setConfirmando(false);
    }
  };

  const cfg = ESTADO_CFG[mesa.estado ?? 'disponible'];

  if (cargProd || cargPedido) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div className="flex flex-col h-full">

      {/* ── Header de mesa ── */}
      <div
        className="rounded-2xl p-4 mb-5 flex items-center gap-4"
        style={{ background: cfg.bg, border: `1.5px solid ${cfg.color}30` }}
      >
        <button
          onClick={onVolver}
          className="p-2 rounded-xl shrink-0 transition-colors"
          style={{ background: `${cfg.color}15`, color: cfg.color }}
          onMouseEnter={e => e.currentTarget.style.background = `${cfg.color}25`}
          onMouseLeave={e => e.currentTarget.style.background = `${cfg.color}15`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black" style={{ color: cfg.color }}>
            {mesa.nombre ?? `Mesa ${mesa.numero}`}
          </p>
          <p className="text-xs" style={{ color: B.muted }}>
            {mesa.zona} · {mesa.capacidad} personas ·{' '}
            <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
            {pedidoId && ' · Pedido activo — se agregarán items'}
          </p>
        </div>
        {/* Botón carrito mobile */}
        <button
          onClick={() => setPanelCarrito(true)}
          className="relative flex lg:hidden items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold"
          style={{ background: B.green, color: B.cream }}
        >
          <ShoppingCart className="w-4 h-4" />
          {totalItems > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center"
              style={{ background: B.terra, color: '#fff' }}
            >
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* ── Layout principal ── */}
      <div className="flex gap-5 flex-1 min-h-0">

        {/* ── Panel izquierdo: catálogo ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: B.white, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
            />
          </div>

          {/* Tabs de categoría */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {categorias.map(cat => {
              const activo = categoria === cat;
              const color  = cat === 'Todas' ? B.charcoal : catColor(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setCategoria(cat)}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: activo ? color : B.cream,
                    color:      activo ? '#fff'  : B.charcoal,
                    border:     `1px solid ${activo ? color : B.creamDark}`,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Grid de productos */}
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16" style={{ color: B.muted }}>
              <Package className="w-10 h-10 opacity-30" />
              <p className="text-sm">Sin productos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pb-4">
              {filtrados.map(prod => {
                const qty    = cantidadEnCarrito(prod.id);
                const color  = catColor(prod.categoria);
                const sinStock = prod.stock_tienda === 0;

                return (
                  <div
                    key={prod.id}
                    className="rounded-2xl overflow-hidden flex flex-col transition-all duration-150"
                    style={{
                      background: B.white,
                      border: `1.5px solid ${qty > 0 ? color : B.creamDark}`,
                      boxShadow: qty > 0 ? `0 2px 12px ${color}25` : 'none',
                      opacity: sinStock ? 0.55 : 1,
                    }}
                  >
                    {/* Cabecera color */}
                    <div
                      className="px-3 pt-3 pb-2 flex items-start justify-between gap-2"
                      style={{ background: `${color}10` }}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[9px] font-black uppercase tracking-wider mb-0.5"
                          style={{ color }}
                        >
                          {prod.categoria}
                        </p>
                        <p
                          className="text-sm font-bold leading-tight"
                          style={{ color: B.charcoal }}
                        >
                          {prod.nombre}
                        </p>
                      </div>
                      {qty > 0 && (
                        <span
                          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                          style={{ background: color, color: '#fff' }}
                        >
                          {qty}
                        </span>
                      )}
                    </div>

                    {/* Precio y stock */}
                    <div className="px-3 py-2 flex items-center justify-between">
                      <span className="text-sm font-black" style={{ color: B.charcoal }}>
                        {fmtSoles(prod.precio)}
                      </span>
                      <span className="text-[10px]" style={{ color: sinStock ? B.terra : B.muted }}>
                        {sinStock ? 'Sin stock' : `Stock: ${prod.stock_tienda}`}
                      </span>
                    </div>

                    {/* Control cantidad */}
                    <div className="px-3 pb-3 mt-auto">
                      {qty === 0 ? (
                        <button
                          onClick={() => !sinStock && agregarAlCarrito(prod)}
                          disabled={sinStock}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
                          style={{
                            background: sinStock ? B.cream : color,
                            color: sinStock ? B.muted : '#fff',
                            cursor: sinStock ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Agregar
                        </button>
                      ) : (
                        <div
                          className="flex items-center justify-between rounded-xl overflow-hidden"
                          style={{ border: `1.5px solid ${color}` }}
                        >
                          <button
                            onClick={() => cambiarCantidad(prod.id, -1)}
                            className="flex-1 flex items-center justify-center py-2 transition-colors"
                            style={{ color }}
                            onMouseEnter={e => e.currentTarget.style.background = `${color}15`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-black px-3" style={{ color: B.charcoal }}>{qty}</span>
                          <button
                            onClick={() => agregarAlCarrito(prod)}
                            className="flex-1 flex items-center justify-center py-2 transition-colors"
                            style={{ color }}
                            onMouseEnter={e => e.currentTarget.style.background = `${color}15`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Panel derecho: carrito (desktop) ── */}
        <div
          className="hidden lg:flex flex-col rounded-2xl overflow-hidden shrink-0"
          style={{ width: 300, background: B.white, border: `1px solid ${B.creamDark}` }}
        >
          <CarritoPanel
            carrito={carrito}
            notas={notas}
            setNotas={setNotas}
            subtotal={subtotal}
            totalItems={totalItems}
            onCambiarCantidad={cambiarCantidad}
            onQuitar={quitarDelCarrito}
            onConfirmar={confirmarPedido}
            confirmando={confirmando}
            error={error}
            pedidoExistente={!!pedidoId}
          />
        </div>
      </div>

      {/* ── Drawer carrito mobile ── */}
      {panelCarrito && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:hidden"
          style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPanelCarrito(false)}
        >
          <div
            className="w-full rounded-t-3xl overflow-hidden flex flex-col"
            style={{ background: B.white, maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0"
              style={{ borderBottom: `1px solid ${B.creamDark}` }}
            >
              <h3 className="font-bold" style={{ color: B.charcoal }}>Pedido</h3>
              <button onClick={() => setPanelCarrito(false)} style={{ color: B.muted }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CarritoPanel
                carrito={carrito}
                notas={notas}
                setNotas={setNotas}
                subtotal={subtotal}
                totalItems={totalItems}
                onCambiarCantidad={cambiarCantidad}
                onQuitar={quitarDelCarrito}
                onConfirmar={() => { setPanelCarrito(false); confirmarPedido(); }}
                confirmando={confirmando}
                error={error}
                pedidoExistente={!!pedidoId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel carrito (reutilizable desktop + drawer mobile) ────────────────────

interface CarritoPanelProps {
  carrito: ItemCarrito[];
  notas: Record<string, string>;
  setNotas: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  subtotal: number;
  totalItems: number;
  onCambiarCantidad: (id: string, delta: number) => void;
  onQuitar: (id: string) => void;
  onConfirmar: () => void;
  confirmando: boolean;
  error: string;
  pedidoExistente: boolean;
}

function CarritoPanel({
  carrito, notas, setNotas, subtotal, totalItems,
  onCambiarCantidad, onQuitar, onConfirmar, confirmando, error, pedidoExistente,
}: CarritoPanelProps) {
  return (
    <>
      {/* Header */}
      <div
        className="px-4 py-3 shrink-0 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${B.creamDark}`, background: B.cream }}
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4" style={{ color: B.charcoal }} />
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: B.charcoal }}>
            Pedido
          </span>
        </div>
        {totalItems > 0 && (
          <span
            className="text-xs font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: B.green, color: '#fff' }}
          >
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {carrito.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12" style={{ color: B.muted }}>
            <ShoppingCart className="w-10 h-10 opacity-25" />
            <p className="text-xs text-center px-4">
              Agrega productos del catálogo para armar el pedido
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
            {carrito.map(item => {
              const color = catColor(item.producto.categoria);
              return (
                <div key={item.producto.id} className="px-4 py-3" style={{ borderColor: B.creamDark }}>
                  {/* Fila nombre + quitar */}
                  <div className="flex items-start gap-2 mb-2">
                    <div
                      className="w-1 rounded-full mt-1 shrink-0"
                      style={{ height: 28, background: color }}
                    />
                    <p className="text-sm font-semibold flex-1 leading-tight" style={{ color: B.charcoal }}>
                      {item.producto.nombre}
                    </p>
                    <button
                      onClick={() => onQuitar(item.producto.id)}
                      className="p-1 rounded-lg shrink-0"
                      style={{ color: B.muted }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = B.terra; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = B.muted; }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Cantidad + subtotal */}
                  <div className="flex items-center justify-between mb-2 pl-3">
                    <div
                      className="flex items-center rounded-xl overflow-hidden"
                      style={{ border: `1.5px solid ${color}` }}
                    >
                      <button
                        onClick={() => onCambiarCantidad(item.producto.id, -1)}
                        className="px-2.5 py-1.5 text-sm transition-colors"
                        style={{ color }}
                        onMouseEnter={e => e.currentTarget.style.background = `${color}15`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 text-sm font-black" style={{ color: B.charcoal }}>
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => onCambiarCantidad(item.producto.id, 1)}
                        className="px-2.5 py-1.5 text-sm transition-colors"
                        style={{ color }}
                        onMouseEnter={e => e.currentTarget.style.background = `${color}15`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold" style={{ color: B.charcoal }}>
                      {fmtSoles(item.cantidad * item.producto.precio)}
                    </span>
                  </div>

                  {/* Notas del item */}
                  <input
                    type="text"
                    value={notas[item.producto.id] ?? ''}
                    onChange={e => setNotas(n => ({ ...n, [item.producto.id]: e.target.value }))}
                    placeholder="Nota para cocina (opcional)..."
                    className="w-full pl-3 pr-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: total + confirmar */}
      <div className="shrink-0 px-4 py-4 space-y-3" style={{ borderTop: `2px solid ${B.creamDark}` }}>
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wide" style={{ color: B.muted }}>
            Subtotal estimado
          </span>
          <span className="text-xl font-black" style={{ color: B.charcoal }}>
            {fmtSoles(subtotal)}
          </span>
        </div>

        {/* Nota sobre pago */}
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
          style={{ background: `${B.green}12`, color: B.green }}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            {pedidoExistente
              ? 'Los productos se agregarán al pedido existente de esta mesa.'
              : 'El pago se realizará después desde el módulo Mesas.'}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ background: '#fef0e6', color: B.terra }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Botón confirmar */}
        <button
          onClick={onConfirmar}
          disabled={confirmando || carrito.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
          style={{ background: B.green, color: B.cream }}
          onMouseEnter={e => { if (!confirmando && carrito.length > 0) e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          {confirmando
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <CheckCircle className="w-4 h-4" />
          }
          {pedidoExistente ? 'Agregar al pedido' : 'Confirmar pedido'}
        </button>
      </div>
    </>
  );
}

// ─── Pantalla de éxito ────────────────────────────────────────────────────────

function PantallaExito({ mesa, onNuevoPedido, onVolver }: {
  mesa: MesaConPedido;
  onNuevoPedido: () => void;
  onVolver: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] gap-6 text-center px-4">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: `${B.green}18` }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: B.green }} />
      </div>
      <div>
        <h2 className="text-2xl font-black mb-2" style={{ color: B.charcoal }}>
          ¡Pedido confirmado!
        </h2>
        <p className="text-sm" style={{ color: B.muted }}>
          Los productos fueron enviados a{' '}
          <span className="font-bold" style={{ color: B.charcoal }}>
            {mesa.nombre ?? `Mesa ${mesa.numero}`}
          </span>
          . El pago se realizará desde el módulo Mesas.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onVolver}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}
        >
          Volver a mesas
        </button>
        <button
          onClick={onNuevoPedido}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: B.green, color: B.cream }}
        >
          <Plus className="w-4 h-4" />
          Otro pedido
        </button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

type Paso = 'seleccionar' | 'pedido' | 'exito';

export default function VentaMesaView() {
  const [paso,  setPaso]  = useState<Paso>('seleccionar');
  const [mesa,  setMesa]  = useState<MesaConPedido | null>(null);

  const handleSeleccionarMesa = (m: MesaConPedido) => {
    setMesa(m);
    setPaso('pedido');
  };

  const handleConfirmado = () => {
    setPaso('exito');
  };

  const handleNuevoPedido = () => {
    setMesa(null);
    setPaso('seleccionar');
  };

  return (
    <div>
      <PageHeader
        title="Venta Mesa"
        subtitle={
          paso === 'seleccionar'
            ? 'Selecciona una mesa para tomar el pedido'
            : paso === 'pedido' && mesa
            ? `Tomando pedido — ${mesa.nombre ?? `Mesa ${mesa.numero}`} · ${mesa.zona}`
            : 'Pedido confirmado'
        }
      />

      {paso === 'seleccionar' && (
        <SelectorMesa onSelect={handleSeleccionarMesa} />
      )}

      {paso === 'pedido' && mesa && (
        <TomaPedido
          mesa={mesa}
          onVolver={() => { setMesa(null); setPaso('seleccionar'); }}
          onConfirmado={handleConfirmado}
        />
      )}

      {paso === 'exito' && mesa && (
        <PantallaExito
          mesa={mesa}
          onNuevoPedido={handleNuevoPedido}
          onVolver={handleNuevoPedido}
        />
      )}
    </div>
  );
}