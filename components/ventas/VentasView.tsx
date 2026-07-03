// components/ventas/VentasView.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, Package, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { ProductoCard }  from '@/components/ventas/ProductoCard';
import { CarritoPanel }  from '@/components/ventas/CarritoPanel';
import { ModalCobro }    from '@/components/ventas/modals/ModalCobro';
import { POR_PAGINA }    from '@/constants/ventas/ventasConstants';
import type { Producto, CartItem } from '@/lib/supabase/types';

export default function VentasView() {
  const { productos, isLoading, cajas } = useGlobalData();
  const { usuario }              = useAuth();

  // ── Filtros y paginación ──────────────────────────────────────────────────
  const [busqueda,   setBusqueda]   = useState('');
  const [categoria,  setCategoria]  = useState('Todos');
  const [pagina,     setPagina]     = useState(1);

  // ── Carrito ───────────────────────────────────────────────────────────────
  const [carrito,    setCarrito]    = useState<CartItem[]>([]);
  const [modalCobro, setModalCobro] = useState(false);

  // ── Catálogo: solo productos de venta activos ─────────────────────────────
  const productosVenta = useMemo(
    () => productos.filter((p) => p.tipo === 'producto_venta' && p.activo),
    [productos],
  );

  const categorias = useMemo(() => {
    const cats = [...new Set(productosVenta.map((p) => p.categoria))].sort();
    return ['Todos', ...cats];
  }, [productosVenta]);

  const filtrados = useMemo(
    () =>
      productosVenta.filter((p) => {
        const matchQ   = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
        const matchCat = categoria === 'Todos' || p.categoria === categoria;
        return matchQ && matchCat;
      }),
    [productosVenta, busqueda, categoria],
  );

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // ── Totales del carrito ───────────────────────────────────────────────────
  // Los precios de los productos YA incluyen IGV.
  // total   = suma de (precio × cantidad)  ← lo que paga el cliente
  // igv     = total − total/1.18           ← IGV contenido
  // base    = total / 1.18                 ← base imponible (solo informativo)
  const total = useMemo(
    () => carrito.reduce((a, i) => a + i.precio * i.cantidad, 0),
    [carrito],
  );
  const igv  = parseFloat((total - total / 1.18).toFixed(2));
  const base = parseFloat((total / 1.18).toFixed(2));

  // ── Validación de caja abierta ────────────────────────────────────────────
  const cajaAbierta = useMemo(() => {
    if (!usuario?.caja_id) return false;
    const caja = cajas.find(c => c.id === usuario.caja_id);
    return caja?.estado === 'abierta';
  }, [cajas, usuario]);

  // ── Acciones del carrito ──────────────────────────────────────────────────
  const agregarProducto = useCallback((p: Producto) => {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.id === p.id);
      if (existe) {
        if (existe.cantidad >= p.stock_tienda) return prev;
        return prev.map((i) =>
          i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i,
        );
      }
      return [
        ...prev,
        { id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, stock_tienda: p.stock_tienda },
      ];
    });
  }, []);

  const actualizarCantidad = useCallback((id: string, qty: number) => {
    if (qty <= 0) setCarrito((prev) => prev.filter((i) => i.id !== id));
    else          setCarrito((prev) => prev.map((i) => i.id === id ? { ...i, cantidad: qty } : i));
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: B.green }} />
          <p className="text-sm" style={{ color: B.muted }}>Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Punto de Venta" subtitle="Selecciona productos y procesa la venta" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Columna catálogo ── */}
        <div className="lg:col-span-2 space-y-4">

        {/* Búsqueda */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: B.muted }}
              />
              <input
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }}
              />
            </div>

            {/* Dropdown categorías */}
            <select
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value); setPagina(1); }}
              className="py-3 px-3 rounded-xl text-sm font-semibold outline-none cursor-pointer shrink-0"
              style={{
                background: B.white,
                border: `1px solid ${B.cream}`,
                color: B.charcoal,
                minWidth: 140,
              }}
            >
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

          {/* Grid de productos */}
          {paginados.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginados.map((p) => (
                <ProductoCard key={p.id} producto={p} onAdd={agregarProducto} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16" style={{ color: B.muted }}>
              <Package className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No se encontraron productos</p>
            </div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="p-2 rounded-xl disabled:opacity-40"
                style={{ background: B.white, border: `1px solid ${B.cream}` }}
              >
                <ChevronLeft className="w-4 h-4" style={{ color: B.charcoal }} />
              </button>
              <span className="text-sm font-medium" style={{ color: B.charcoal }}>
                {pagina} / {totalPaginas}
              </span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="p-2 rounded-xl disabled:opacity-40"
                style={{ background: B.white, border: `1px solid ${B.cream}` }}
              >
                <ChevronRight className="w-4 h-4" style={{ color: B.charcoal }} />
              </button>
            </div>
          )}
        </div>

        {/* ── Carrito sticky ── */}
        <div className="lg:sticky lg:top-4 h-fit">
          <CarritoPanel
            carrito={carrito}
            base={base}
            igv={igv}
            total={total}
            onActualizar={actualizarCantidad}
            onLimpiar={() => setCarrito([])}
            onProcesar={() => setModalCobro(true)}
            cajaAbierta={cajaAbierta}
          />
        </div>
      </div>

      {/* Modal de cobro */}
      {modalCobro && (
        <ModalCobro
          subtotal={total}
          carrito={carrito}
          cajaId={usuario?.caja_id ?? undefined}
          onClose={() => setModalCobro(false)}
          onSuccess={() => { setModalCobro(false); setCarrito([]); }}
        />
      )}
    </div>
  );
}