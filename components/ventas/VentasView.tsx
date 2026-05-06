//components/ventas/VentasView.tsx
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Package,
  X, Banknote, CreditCard, Smartphone, ChevronLeft, ChevronRight,
  Loader2, CheckCircle,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { crearVenta } from '@/lib/supabase/queries';
import type { Producto, CartItem, MetodoPago, TipoComprobante } from '@/lib/supabase/types';
import Image from 'next/image';

// ─── Constantes ───────────────────────────────────────────────────────────────
const POR_PAGINA = 12;

// ─── ProductoCard ─────────────────────────────────────────────────────────────
function ProductoCard({ producto, onAdd }: { producto: Producto; onAdd: (p: Producto) => void }) {
  const sinStock = producto.stock_tienda === 0;
  return (
    <button
      onClick={() => !sinStock && onAdd(producto)}
      disabled={sinStock}
      className="rounded-2xl text-left transition-all duration-200 overflow-hidden"
      style={{
        background: B.white, border: `1.5px solid ${B.cream}`,
        opacity: sinStock ? 0.5 : 1, cursor: sinStock ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => { if (!sinStock) { e.currentTarget.style.borderColor = B.green; e.currentTarget.style.boxShadow = `0 4px 16px ${B.green}25`; }}}
      onMouseLeave={e => { e.currentTarget.style.borderColor = B.cream; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div className="h-28 flex items-center justify-center relative" style={{ background: B.cream }}>
        {producto.imagen
          ? <Image
              src={producto.imagen}
              alt={producto.nombre}
              fill
              className="object-cover"
            />
          : <Package className="w-10 h-10" style={{ color: B.creamDark }} />
        }
      </div>
      <div className="p-3">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: `${B.green}18`, color: B.green }}>
          {producto.categoria}
        </span>
        <p className="text-sm font-semibold mt-1.5 leading-tight line-clamp-2" style={{ color: B.charcoal }}>
          {producto.nombre}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-base font-black" style={{ color: B.terra }}>S/ {producto.precio.toFixed(2)}</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded-lg" style={{ background: B.cream, color: B.muted }}>
            {sinStock ? 'Sin stock' : `Stock: ${producto.stock_tienda}`}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── CartRow ──────────────────────────────────────────────────────────────────
function CartRow({ item, onUpdate }: { item: CartItem; onUpdate: (id: string, qty: number) => void }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: B.cream }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: B.charcoal }}>{item.nombre}</p>
        <p className="text-xs" style={{ color: B.muted }}>S/ {item.precio.toFixed(2)} c/u</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onUpdate(item.id, item.cantidad - 1)}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: B.cream }}
          onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
          onMouseLeave={e => e.currentTarget.style.background = B.cream}>
          <Minus className="w-3 h-3" style={{ color: B.charcoal }} />
        </button>
        <span className="w-7 text-center text-sm font-bold" style={{ color: B.charcoal }}>{item.cantidad}</span>
        <button onClick={() => onUpdate(item.id, Math.min(item.cantidad + 1, item.stock_tienda))}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: B.cream }}
          onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
          onMouseLeave={e => e.currentTarget.style.background = B.cream}>
          <Plus className="w-3 h-3" style={{ color: B.charcoal }} />
        </button>
        <button onClick={() => onUpdate(item.id, 0)}
          className="w-6 h-6 rounded-lg flex items-center justify-center ml-1"
          style={{ background: '#fee2e2' }}
          onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
          onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}>
          <Trash2 className="w-3 h-3" style={{ color: B.terra }} />
        </button>
      </div>
    </div>
  );
}

// ─── Modal Cobro ──────────────────────────────────────────────────────────────
interface ModalCobroProps {
  subtotal: number; igv: number; total: number;
  carrito: CartItem[]; cajaId?: string; mesaId?: string;
  onClose: () => void; onSuccess: () => void;
}

function ModalCobro({ subtotal, igv, total, carrito, cajaId, mesaId, onClose, onSuccess }: ModalCobroProps) {
  const { usuario } = useAuth();
  const { refetchVentas, refetchVentasRecientes, refetchProductos } = useGlobalData();

  const [metodo,    setMetodo]    = useState<MetodoPago>('efectivo');
  const [tipo,      setTipo]      = useState<TipoComprobante>('nota_venta');
  const [efectivo,  setEfectivo]  = useState('');
  const [procesando,setProcesando]= useState(false);
  const [exito,     setExito]     = useState(false);
  const [error,     setError]     = useState('');

  const vuelto = metodo === 'efectivo'
    ? Math.max(0, parseFloat(efectivo || '0') - total) : 0;
  const puedeConfirmar = metodo !== 'efectivo' || parseFloat(efectivo || '0') >= total;

  const handleConfirmar = async () => {
    if (!puedeConfirmar || !usuario) return;
    setProcesando(true); setError('');
    try {
      await crearVenta({
        items: carrito, tipo_comprobante: tipo, metodo_pago: metodo,
        caja_id: cajaId, mesa_id: mesaId,
        monto_recibido: efectivo ? parseFloat(efectivo) : undefined,
      }, usuario.id);

      setExito(true);
      await Promise.all([refetchVentas(), refetchVentasRecientes(), refetchProductos()]);
      setTimeout(() => { onSuccess(); }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar la venta');
    } finally {
      setProcesando(false);
    }
  };

  const METODOS: { key: MetodoPago; label: string; icon: React.ReactNode }[] = [
    { key: 'efectivo', label: 'Efectivo',  icon: <Banknote   className="w-4 h-4" /> },
    { key: 'tarjeta',  label: 'Tarjeta',   icon: <CreditCard className="w-4 h-4" /> },
    { key: 'yape',     label: 'Yape/Plin', icon: <Smartphone className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={!procesando ? onClose : undefined}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Procesar Venta</h2>
          {!procesando && (
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
              onMouseEnter={e => e.currentTarget.style.background = B.cream}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Éxito */}
          {exito ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle className="w-16 h-16" style={{ color: B.green }} />
              <p className="text-lg font-bold" style={{ color: B.charcoal }}>¡Venta registrada!</p>
              <p className="text-sm" style={{ color: B.muted }}>Comprobante generado correctamente</p>
            </div>
          ) : (
            <>
              {/* Tipo comprobante */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>Comprobante</p>
                <div className="flex gap-2">
                  {(['nota_venta', 'boleta', 'factura'] as TipoComprobante[]).map(t => (
                    <button key={t} onClick={() => setTipo(t)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style={tipo === t ? { background: B.charcoal, color: B.cream } : { background: B.cream, color: B.charcoal }}>
                      {t === 'nota_venta' ? 'Nota Venta' : t === 'boleta' ? 'Boleta' : 'Factura'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: B.cream }}>
                <div className="flex justify-between text-sm" style={{ color: B.charcoal }}>
                  <span>Subtotal</span><span>S/ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: B.charcoal }}>
                  <span>IGV (18%)</span><span>S/ {igv.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-black border-t pt-2"
                  style={{ borderColor: B.creamDark, color: B.charcoal }}>
                  <span>Total</span>
                  <span style={{ color: B.terra }}>S/ {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Método */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>Método de pago</p>
                <div className="flex gap-2">
                  {METODOS.map(m => (
                    <button key={m.key} onClick={() => setMetodo(m.key)}
                      className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all"
                      style={metodo === m.key
                        ? { background: B.green, color: B.cream, boxShadow: `0 2px 10px ${B.green}40` }
                        : { background: B.cream, color: B.charcoal }
                      }>
                      {m.icon}{m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Efectivo */}
              {metodo === 'efectivo' && (
                <div>
                  <label className="text-xs font-black uppercase tracking-widest block mb-1.5" style={{ color: B.muted }}>
                    Efectivo recibido
                  </label>
                  <input type="number" value={efectivo} onChange={e => setEfectivo(e.target.value)}
                    placeholder={`Mínimo S/ ${total.toFixed(2)}`} autoFocus
                    className="w-full px-4 py-3 rounded-xl text-lg font-bold outline-none"
                    style={{ background: B.cream, border: `2px solid ${puedeConfirmar || !efectivo ? B.creamDark : B.terra}`, color: B.charcoal }} />
                  {efectivo && parseFloat(efectivo) >= total && (
                    <div className="mt-2 flex justify-between text-sm font-bold" style={{ color: B.green }}>
                      <span>Vuelto</span><span>S/ {vuelto.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="px-3 py-2 rounded-xl text-sm" style={{ background: '#fef0e6', color: B.terra }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!exito && (
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={onClose} disabled={procesando}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background: B.cream, color: B.charcoal }}>
              Cancelar
            </button>
            <button onClick={handleConfirmar}
              disabled={!puedeConfirmar || procesando}
              className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: puedeConfirmar ? B.green : B.muted, color: B.cream }}>
              {procesando ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : 'Confirmar Venta'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function VentasView() {
  const { productos, isLoading } = useGlobalData();
  const { usuario } = useAuth();

  const [busqueda,   setBusqueda]   = useState('');
  const [categoria,  setCategoria]  = useState('Todos');
  const [pagina,     setPagina]     = useState(1);
  const [carrito,    setCarrito]    = useState<CartItem[]>([]);
  const [modalCobro, setModalCobro] = useState(false);

  // Solo productos de venta con stock
  const productosVenta = useMemo(() =>
    productos.filter(p => p.tipo === 'producto_venta' && p.activo),
  [productos]);

  const categorias = useMemo(() => {
    const cats = [...new Set(productosVenta.map(p => p.categoria))].sort();
    return ['Todos', ...cats];
  }, [productosVenta]);

  const filtrados = useMemo(() => {
    return productosVenta.filter(p => {
      const matchQ   = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const matchCat = categoria === 'Todos' || p.categoria === categoria;
      return matchQ && matchCat;
    });
  }, [productosVenta, busqueda, categoria]);

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const agregarProducto = useCallback((p: Producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id === p.id);
      if (existe) {
        if (existe.cantidad >= p.stock_tienda) return prev;
        return prev.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, stock_tienda: p.stock_tienda }];
    });
  }, []);

  const actualizarCantidad = useCallback((id: string, qty: number) => {
    if (qty <= 0) setCarrito(prev => prev.filter(i => i.id !== id));
    else setCarrito(prev => prev.map(i => i.id === id ? { ...i, cantidad: qty } : i));
  }, []);

  const subtotal = carrito.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const igv      = subtotal * 0.18;
  const total    = subtotal + igv;

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
        {/* Columna productos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
              <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categorias.map(c => (
                <button key={c} onClick={() => { setCategoria(c); setPagina(1); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={categoria === c
                    ? { background: B.charcoal, color: B.cream }
                    : { background: B.white, color: B.charcoal, border: `1px solid ${B.cream}` }
                  }>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {paginados.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginados.map(p => <ProductoCard key={p.id} producto={p} onAdd={agregarProducto} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16" style={{ color: B.muted }}>
              <Package className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No se encontraron productos</p>
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                className="p-2 rounded-xl disabled:opacity-40"
                style={{ background: B.white, border: `1px solid ${B.cream}` }}>
                <ChevronLeft className="w-4 h-4" style={{ color: B.charcoal }} />
              </button>
              <span className="text-sm font-medium" style={{ color: B.charcoal }}>{pagina} / {totalPaginas}</span>
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                className="p-2 rounded-xl disabled:opacity-40"
                style={{ background: B.white, border: `1px solid ${B.cream}` }}>
                <ChevronRight className="w-4 h-4" style={{ color: B.charcoal }} />
              </button>
            </div>
          )}
        </div>

        {/* Carrito sticky */}
        <div className="lg:sticky lg:top-4 h-fit">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: B.charcoal }}>
                <ShoppingCart className="w-5 h-5" style={{ color: B.terra }} />
                Carrito de Venta
              </h2>
              {carrito.length > 0 && (
                <button onClick={() => setCarrito([])}
                  className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: '#fee2e2', color: B.terra }}>
                  Limpiar
                </button>
              )}
            </div>

            {carrito.length === 0 ? (
              <div className="flex flex-col items-center py-10" style={{ color: B.muted }}>
                <ShoppingCart className="w-12 h-12 mb-2 opacity-30" />
                <p className="text-sm">Carrito vacío</p>
              </div>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                  {carrito.map(item => <CartRow key={item.id} item={item} onUpdate={actualizarCantidad} />)}
                </div>
                <div className="mt-4 pt-4 border-t space-y-1.5" style={{ borderColor: B.cream }}>
                  <div className="flex justify-between text-sm" style={{ color: B.muted }}>
                    <span>Subtotal</span><span>S/ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm" style={{ color: B.muted }}>
                    <span>IGV (18%)</span><span>S/ {igv.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black pt-1" style={{ color: B.charcoal }}>
                    <span>Total</span>
                    <span style={{ color: B.terra }}>S/ {total.toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={() => setModalCobro(true)}
                  className="w-full mt-4 py-3 rounded-xl text-sm font-black"
                  style={{ background: B.green, color: B.cream }}>
                  Procesar Venta · S/ {total.toFixed(2)}
                </button>
              </>
            )}
          </Card>
        </div>
      </div>

      {modalCobro && (
        <ModalCobro
          subtotal={subtotal} igv={igv} total={total} carrito={carrito}
          cajaId={usuario?.caja_id ?? undefined}
          onClose={() => setModalCobro(false)}
          onSuccess={() => { setModalCobro(false); setCarrito([]); }}
        />
      )}
    </div>
  );
}