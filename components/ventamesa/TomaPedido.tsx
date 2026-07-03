// components/venta-mesa/TomaPedido.tsx
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Package, ShoppingCart, ArrowLeft, Loader2, X,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getPedidoActivoMesa,
  crearPedido,
  agregarItemPedido,
  actualizarEstadoMesa,
} from '@/lib/supabase/queries';
import { catColor, type ItemCarrito, type MesaRow } from '@/utils/venta-mesa/ventaMesaUtils';
import { ESTADO_CFG } from '@/constants/venta-mesa/ventaMesaConstants';
import { ProductoCard } from './ProductoCard';
import { CarritoPanel } from './CarritoPanel';
import type { Producto } from '@/lib/supabase/types';

interface TomaPedidoProps {
  mesa:          MesaRow;
  onVolver:      () => void;
  onConfirmado:  () => void;
  cajaAbierta:   boolean;
}

export function TomaPedido({ mesa, onVolver, onConfirmado, cajaAbierta }: TomaPedidoProps) {
  const { usuario }           = useAuth();
  // ✅ Productos vienen del contexto global (ya cargados en Fase 2)
  const { productos: todosProductos } = useGlobalData();

  // ── Catálogo filtrado para venta (tipo venta + stock_tienda > 0) ──────────
  // Lo filtramos aquí en cliente para no hacer un fetch extra
  const productos = useMemo(
    () =>
      todosProductos.filter(
        (p) => p.tipo === 'producto_venta' && p.stock_tienda > 0,
      ),
    [todosProductos],
  );

  // ── Carrito ───────────────────────────────────────────────────────────────
  const [carrito,      setCarrito]      = useState<ItemCarrito[]>([]);
  const [notas,        setNotas]        = useState<Record<string, string>>({});

  // ── Pedido existente (si mesa ya estaba ocupada) ──────────────────────────
  const [pedidoId,     setPedidoId]     = useState<string | null>(null);
  const [cargPedido,   setCargPedido]   = useState(true);

  // ── Filtros catálogo ──────────────────────────────────────────────────────
  const [busqueda,     setBusqueda]     = useState('');
  const [categoria,    setCategoria]    = useState('Todas');

  // ── UI ────────────────────────────────────────────────────────────────────
  const [confirmando,  setConfirmando]  = useState(false);
  const [error,        setError]        = useState('');
  const [panelCarrito, setPanelCarrito] = useState(false);

  // ── Cargar pedido activo de la mesa ───────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mesa.estado === 'ocupada') {
        try {
          const p = await getPedidoActivoMesa(mesa.id);
          if (mounted && p) setPedidoId(p.id);
        } finally {
          if (mounted) setCargPedido(false);
        }
      } else {
        setCargPedido(false);
      }
    })();
    return () => { mounted = false; };
  }, [mesa]);

  // ── Categorías únicas ─────────────────────────────────────────────────────
  const categorias = useMemo(
    () => ['Todas', ...[...new Set(productos.map((p) => p.categoria))].sort()],
    [productos],
  );

  // ── Productos filtrados por búsqueda y categoría ──────────────────────────
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return productos.filter((p) => {
      const matchQ =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q);
      const matchC = categoria === 'Todas' || p.categoria === categoria;
      return matchQ && matchC;
    });
  }, [productos, busqueda, categoria]);

  // ── Totales del carrito ───────────────────────────────────────────────────
  const totalItems = useMemo(
    () => carrito.reduce((s, i) => s + i.cantidad, 0),
    [carrito],
  );
  const subtotal = useMemo(
    () => carrito.reduce((s, i) => s + i.cantidad * i.producto.precio, 0),
    [carrito],
  );

  // ── Acciones del carrito ──────────────────────────────────────────────────
  const agregarAlCarrito = useCallback((producto: Producto) => {
    setCarrito((prev) => {
      const idx = prev.findIndex((i) => i.producto.id === producto.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      return [...prev, { producto, cantidad: 1, notas: '' }];
    });
  }, []);

  const cambiarCantidad = useCallback((productoId: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) =>
          i.producto.id === productoId
            ? { ...i, cantidad: Math.max(0, i.cantidad + delta) }
            : i,
        )
        .filter((i) => i.cantidad > 0),
    );
  }, []);

  const quitarDelCarrito = useCallback((productoId: string) => {
    setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId));
  }, []);

  const cantidadEnCarrito = useCallback(
    (productoId: string) =>
      carrito.find((i) => i.producto.id === productoId)?.cantidad ?? 0,
    [carrito],
  );

  // ── Confirmar pedido ──────────────────────────────────────────────────────
  const confirmarPedido = useCallback(async () => {
    if (carrito.length === 0) { setError('Agrega al menos un producto al pedido'); return; }
    if (!usuario)             { setError('No se encontró el usuario activo'); return; }
    setConfirmando(true);
    setError('');

    try {
      let idPedido = pedidoId;
      if (!idPedido) {
        const nuevo = await crearPedido(mesa.id, usuario.id);
        idPedido = nuevo.id;
        setPedidoId(idPedido);
      }

      await Promise.all(
        carrito.map((item) =>
          agregarItemPedido(
            idPedido!,
            item.producto.id,
            item.cantidad,
            item.producto.precio,
            notas[item.producto.id] || undefined,
          ),
        ),
      );

      if (mesa.estado !== 'ocupada') {
        await actualizarEstadoMesa(mesa.id, 'ocupada');
      }

      onConfirmado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al confirmar el pedido');
    } finally {
      setConfirmando(false);
    }
  }, [carrito, usuario, pedidoId, mesa, notas, onConfirmado]);

  const cfg = ESTADO_CFG[mesa.estado ?? 'disponible'];

  if (cargPedido) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
      </div>
    );
  }

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
          onMouseEnter={(e) => (e.currentTarget.style.background = `${cfg.color}25`)}
          onMouseLeave={(e) => (e.currentTarget.style.background = `${cfg.color}15`)}
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

        {/* Panel catálogo */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: B.white, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
            />
          </div>

          {/* Tabs de categoría */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {categorias.map((cat) => {
              const activo = categoria === cat;
              const color  = cat === 'Todas' ? B.charcoal : catColor(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setCategoria(cat)}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: activo ? color : B.cream,
                    color:      activo ? '#fff' : B.charcoal,
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
              {filtrados.map((prod) => (
                <ProductoCard
                  key={prod.id}
                  producto={prod}
                  cantidad={cantidadEnCarrito(prod.id)}
                  onAgregar={agregarAlCarrito}
                  onCambiarCantidad={cambiarCantidad}
                />
              ))}
            </div>
          )}
        </div>

        {/* Panel carrito desktop */}
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
            cajaAbierta={cajaAbierta}
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
            onClick={(e) => e.stopPropagation()}
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
                cajaAbierta={cajaAbierta}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}