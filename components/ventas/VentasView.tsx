'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2,
  Package, X, CreditCard, Banknote, Smartphone,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
}

interface CartItem extends Producto {
  cantidad: number;
}

type MetodoPago = 'efectivo' | 'tarjeta' | 'yape';

// ─── Datos demo ───────────────────────────────────────────────────────────────
const CATEGORIAS = ['Todos', 'Postres', 'Bebidas', 'Cafés', 'Desayunos', 'Ensaladas'];

const PRODUCTOS_DEMO: Producto[] = [
  { id: '1',  nombre: 'Keke de Vainilla',     categoria: 'Postres',    precio: 8.00,  stock: 24 },
  { id: '2',  nombre: 'Brownie Chocolate',    categoria: 'Postres',    precio: 7.00,  stock: 18 },
  { id: '3',  nombre: 'Cheesecake Fresa',     categoria: 'Postres',    precio: 12.00, stock: 10 },
  { id: '4',  nombre: 'Torta Tres Leches',    categoria: 'Postres',    precio: 15.00, stock: 8  },
  { id: '5',  nombre: 'Galleta de Avena',     categoria: 'Postres',    precio: 3.50,  stock: 60 },
  { id: '6',  nombre: 'Café Americano',       categoria: 'Cafés',      precio: 5.00,  stock: 99 },
  { id: '7',  nombre: 'Latte Vainilla',       categoria: 'Cafés',      precio: 9.00,  stock: 99 },
  { id: '8',  nombre: 'Capuccino',            categoria: 'Cafés',      precio: 9.00,  stock: 99 },
  { id: '9',  nombre: 'Agua San Luis 625ml',  categoria: 'Bebidas',    precio: 2.50,  stock: 45 },
  { id: '10', nombre: 'Limonada Frozen',      categoria: 'Bebidas',    precio: 7.00,  stock: 30 },
  { id: '11', nombre: 'Jugo de Naranja',      categoria: 'Bebidas',    precio: 6.00,  stock: 20 },
  { id: '12', nombre: 'Tostadas con Mermelada', categoria: 'Desayunos', precio: 6.00, stock: 25 },
  { id: '13', nombre: 'Sandwich Integral',    categoria: 'Desayunos',  precio: 8.50,  stock: 15 },
  { id: '14', nombre: 'Ensalada César',       categoria: 'Ensaladas',  precio: 14.00, stock: 12 },
  { id: '15', nombre: 'Ensalada de Fruta',    categoria: 'Ensaladas',  precio: 8.00,  stock: 18 },
  { id: '16', nombre: 'Tiramisú',             categoria: 'Postres',    precio: 11.00, stock: 6  },
];

const POR_PAGINA = 12;

// ─── ProductoCard ─────────────────────────────────────────────────────────────
function ProductoCard({ producto, onAdd }: { producto: Producto; onAdd: (p: Producto) => void }) {
  const sinStock = producto.stock === 0;
  return (
    <button
      onClick={() => !sinStock && onAdd(producto)}
      disabled={sinStock}
      className="rounded-2xl text-left transition-all duration-200 overflow-hidden group"
      style={{
        background: B.white,
        border: `1.5px solid ${B.cream}`,
        opacity: sinStock ? 0.5 : 1,
        cursor: sinStock ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => { if (!sinStock) { e.currentTarget.style.borderColor = B.green; e.currentTarget.style.boxShadow = `0 4px 16px ${B.green}25`; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = B.cream; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Imagen placeholder */}
      <div className="h-28 flex items-center justify-center" style={{ background: B.cream }}>
        <Package className="w-10 h-10" style={{ color: B.creamDark }} />
      </div>

      <div className="p-3">
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: `${B.green}18`, color: B.green }}
        >
          {producto.categoria}
        </span>
        <p className="text-sm font-semibold mt-1.5 leading-tight line-clamp-2" style={{ color: B.charcoal }}>
          {producto.nombre}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-base font-black" style={{ color: B.terra }}>
            S/ {producto.precio.toFixed(2)}
          </p>
          <span className="text-[10px] px-1.5 py-0.5 rounded-lg" style={{ background: B.cream, color: B.muted }}>
            {sinStock ? 'Sin stock' : `Stock: ${producto.stock}`}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── CartItem row ─────────────────────────────────────────────────────────────
function CartRow({ item, onUpdate }: { item: CartItem; onUpdate: (id: string, qty: number) => void }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: B.cream }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: B.charcoal }}>{item.nombre}</p>
        <p className="text-xs" style={{ color: B.muted }}>S/ {item.precio.toFixed(2)} c/u</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onUpdate(item.id, item.cantidad - 1)}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: B.cream }}
          onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
          onMouseLeave={e => e.currentTarget.style.background = B.cream}
        >
          <Minus className="w-3 h-3" style={{ color: B.charcoal }} />
        </button>
        <span className="w-7 text-center text-sm font-bold" style={{ color: B.charcoal }}>
          {item.cantidad}
        </span>
        <button
          onClick={() => onUpdate(item.id, item.cantidad + 1)}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: B.cream }}
          onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
          onMouseLeave={e => e.currentTarget.style.background = B.cream}
        >
          <Plus className="w-3 h-3" style={{ color: B.charcoal }} />
        </button>
        <button
          onClick={() => onUpdate(item.id, 0)}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors ml-1"
          style={{ background: '#fee2e2' }}
          onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
          onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
        >
          <Trash2 className="w-3 h-3" style={{ color: B.terra }} />
        </button>
      </div>
    </div>
  );
}

// ─── Modal cobro ──────────────────────────────────────────────────────────────
interface ModalCobroProps {
  total: number;
  subtotal: number;
  igv: number;
  carrito: CartItem[];
  onClose: () => void;
  onSuccess: () => void;
}

function ModalCobro({ total, subtotal, igv, carrito, onClose, onSuccess }: ModalCobroProps) {
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [tipo, setTipo] = useState<'nota' | 'boleta'>('nota');
  const [procesando, setProcesando] = useState(false);

  const vuelto = metodo === 'efectivo'
    ? Math.max(0, parseFloat(efectivoRecibido || '0') - total)
    : 0;

  const puedeConfirmar =
    metodo !== 'efectivo' ||
    (parseFloat(efectivoRecibido || '0') >= total);

  const handleConfirmar = async () => {
    if (!puedeConfirmar) return;
    setProcesando(true);
    // Simula procesamiento — aquí conectarías con Supabase
    await new Promise(r => setTimeout(r, 800));
    setProcesando(false);
    onSuccess();
  };

  const METODOS: { key: MetodoPago; label: string; icon: React.ReactNode }[] = [
    { key: 'efectivo', label: 'Efectivo',  icon: <Banknote className="w-4 h-4" /> },
    { key: 'tarjeta',  label: 'Tarjeta',   icon: <CreditCard className="w-4 h-4" /> },
    { key: 'yape',     label: 'Yape/Plin', icon: <Smartphone className="w-4 h-4" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Procesar Venta</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tipo comprobante */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>
              Tipo de comprobante
            </p>
            <div className="flex gap-2">
              {(['nota', 'boleta'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                  style={tipo === t
                    ? { background: B.charcoal, color: B.cream }
                    : { background: B.cream, color: B.charcoal }
                  }
                >
                  {t === 'nota' ? 'Nota de Venta' : 'Boleta'}
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
            <div className="flex justify-between text-lg font-black border-t pt-2" style={{ borderColor: B.creamDark, color: B.charcoal }}>
              <span>Total</span><span style={{ color: B.terra }}>S/ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>
              Método de pago
            </p>
            <div className="flex gap-2">
              {METODOS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMetodo(m.key)}
                  className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all"
                  style={metodo === m.key
                    ? { background: B.green, color: B.cream, boxShadow: `0 2px 10px ${B.green}40` }
                    : { background: B.cream, color: B.charcoal }
                  }
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Efectivo recibido */}
          {metodo === 'efectivo' && (
            <div>
              <label className="text-xs font-black uppercase tracking-widest block mb-1.5" style={{ color: B.muted }}>
                Efectivo recibido
              </label>
              <input
                type="number"
                value={efectivoRecibido}
                onChange={e => setEfectivoRecibido(e.target.value)}
                placeholder={`Mínimo S/ ${total.toFixed(2)}`}
                className="w-full px-4 py-3 rounded-xl text-lg font-bold outline-none"
                style={{ background: B.cream, border: `2px solid ${puedeConfirmar || !efectivoRecibido ? B.creamDark : B.terra}`, color: B.charcoal }}
                autoFocus
              />
              {efectivoRecibido && parseFloat(efectivoRecibido) >= total && (
                <div className="mt-2 flex justify-between text-sm font-bold" style={{ color: B.green }}>
                  <span>Vuelto</span>
                  <span>S/ {vuelto.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!puedeConfirmar || procesando}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: puedeConfirmar ? B.green : B.muted,
              color: B.cream,
              opacity: procesando ? 0.7 : 1,
            }}
          >
            {procesando ? 'Procesando...' : 'Confirmar Venta'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function VentasView() {
  const [busqueda, setBusqueda]       = useState('');
  const [categoria, setCategoria]     = useState('Todos');
  const [pagina, setPagina]           = useState(1);
  const [carrito, setCarrito]         = useState<CartItem[]>([]);
  const [modalCobro, setModalCobro]   = useState(false);

  // Filtrado
  const filtrados = useMemo(() => {
    return PRODUCTOS_DEMO.filter(p => {
      const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const matchCat      = categoria === 'Todos' || p.categoria === categoria;
      return matchBusqueda && matchCat;
    });
  }, [busqueda, categoria]);

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // Carrito
  const agregarProducto = (p: Producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id === p.id);
      if (existe) return prev.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { ...p, cantidad: 1 }];
    });
  };

  const actualizarCantidad = (id: string, qty: number) => {
    if (qty <= 0) setCarrito(prev => prev.filter(i => i.id !== id));
    else setCarrito(prev => prev.map(i => i.id === id ? { ...i, cantidad: qty } : i));
  };

  const limpiarCarrito = () => setCarrito([]);

  // Totales
  const subtotal = carrito.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const igv      = subtotal * 0.18;
  const total    = subtotal + igv;

  const handleSuccess = () => {
    setModalCobro(false);
    limpiarCarrito();
  };

  return (
    <div>
      <PageHeader title="Punto de Venta" subtitle="Selecciona productos y procesa la venta" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Columna productos ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Búsqueda + categorías */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
              <input
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIAS.map(c => (
                <button
                  key={c}
                  onClick={() => { setCategoria(c); setPagina(1); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={categoria === c
                    ? { background: B.charcoal, color: B.cream }
                    : { background: B.white, color: B.charcoal, border: `1px solid ${B.cream}` }
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {paginados.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginados.map(p => (
                <ProductoCard key={p.id} producto={p} onAdd={agregarProducto} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: B.muted }}>
              <Package className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No se encontraron productos</p>
            </div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
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
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="p-2 rounded-xl disabled:opacity-40"
                style={{ background: B.white, border: `1px solid ${B.cream}` }}
              >
                <ChevronRight className="w-4 h-4" style={{ color: B.charcoal }} />
              </button>
            </div>
          )}
        </div>

        {/* ── Carrito (sticky) ── */}
        <div className="lg:sticky lg:top-4 h-fit">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: B.charcoal }}>
                <ShoppingCart className="w-5 h-5" style={{ color: B.terra }} />
                Carrito de Venta
              </h2>
              {carrito.length > 0 && (
                <button
                  onClick={limpiarCarrito}
                  className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: '#fee2e2', color: B.terra }}
                >
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
                  {carrito.map(item => (
                    <CartRow key={item.id} item={item} onUpdate={actualizarCantidad} />
                  ))}
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

                <button
                  onClick={() => setModalCobro(true)}
                  className="w-full mt-4 py-3 rounded-xl text-sm font-black transition-all"
                  style={{ background: B.green, color: B.cream }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Procesar Venta · S/ {total.toFixed(2)}
                </button>
              </>
            )}
          </Card>
        </div>
      </div>

      {modalCobro && (
        <ModalCobro
          total={total}
          subtotal={subtotal}
          igv={igv}
          carrito={carrito}
          onClose={() => setModalCobro(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}