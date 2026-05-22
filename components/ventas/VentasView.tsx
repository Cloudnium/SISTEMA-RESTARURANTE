'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Package,
  X, Banknote, CreditCard, Smartphone, ChevronLeft, ChevronRight,
  Loader2, CheckCircle, UserCircle, UserPlus, Users, Building2,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { crearVenta, crearCliente } from '@/lib/supabase/queries';
import type { Producto, CartItem, MetodoPago, TipoComprobante, Cliente } from '@/lib/supabase/types';
import Image from 'next/image';

// ─── Constantes ───────────────────────────────────────────────────────────────
const POR_PAGINA = 12;

const CLIENTE_GENERAL: Cliente = {
  id: '__general__', tipo: 'persona', nombre: 'Cliente General',
  ruc: null, dni: null, telefono: null, email: null, direccion: null,
  fecha_nacimiento: null, puntos_acumulados: 0, activo: true,
  created_at: '', updated_at: '', dni_extranjero: null,
};

const METODOS_PAGO_COMPLETOS: { key: MetodoPago; label: string; icon: React.ElementType }[] = [
  { key: 'efectivo',      label: 'Efectivo',  icon: Banknote   },
  { key: 'tarjeta',       label: 'Tarjeta',   icon: CreditCard },
  { key: 'yape',          label: 'Yape',      icon: Smartphone },
  { key: 'plin',          label: 'Plin',      icon: Smartphone },
  { key: 'transferencia', label: 'Transfer',  icon: CreditCard },
  { key: 'izipay',        label: 'Izipay',    icon: CreditCard },
];

const COMPROBANTES_PV: { id: TipoComprobante; label: string; desc: string }[] = [
  { id: 'boleta',     label: 'Boleta',        desc: 'Consumidor final' },
  { id: 'factura',    label: 'Factura',       desc: 'Con RUC empresa'  },
  { id: 'nota_venta', label: 'Nota de Venta', desc: 'Sin IGV separado' },
];

// ─── Modal Registrar Cliente ──────────────────────────────────────────────────
type TipoClienteLocal = 'persona' | 'empresa';
interface FormCliente {
  tipo: TipoClienteLocal; nombre: string; documento: string;
  telefono: string; email: string; direccion: string;
}
const FORM_CLI_VACIO: FormCliente = {
  tipo: 'persona', nombre: '', documento: '', telefono: '', email: '', direccion: '',
};

function ModalRegistrarClientePV({ tipoComprobante, onClose, onRegistrado }: {
  tipoComprobante: TipoComprobante;
  onClose: () => void;
  onRegistrado: (c: Cliente) => void;
}) {
  const tipoForzado: TipoClienteLocal = tipoComprobante === 'factura' ? 'empresa' : 'persona';
  const [form,      setForm]      = useState<FormCliente>({ ...FORM_CLI_VACIO, tipo: tipoForzado });
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
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4"
      style={{ background: 'rgba(20,20,30,0.75)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>
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
        <div className="p-6 space-y-3">
          {/* Tipo */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Tipo</label>
            <div className="flex gap-2">
              {(['persona', 'empresa'] as TipoClienteLocal[]).map(t => {
                const bloqueado = tipoComprobante === 'factura';
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
          {/* Campos */}
          {[
            { key: 'nombre',    label: form.tipo === 'persona' ? 'Nombre completo' : 'Razón social', ph: form.tipo === 'persona' ? 'Juan Pérez' : 'Mi Empresa SAC' },
            { key: 'documento', label: form.tipo === 'persona' ? 'DNI' : 'RUC', ph: form.tipo === 'persona' ? '12345678' : '20123456789' },
            { key: 'telefono',  label: 'Teléfono',  ph: '987654321' },
            { key: 'email',     label: 'Email',     ph: 'correo@ejemplo.com' },
            { key: 'direccion', label: 'Dirección', ph: 'Av. Principal 123' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>{label}</label>
              <input type="text" value={form[key as keyof FormCliente]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          ))}
          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
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
      onMouseEnter={e => { if (!sinStock) { e.currentTarget.style.borderColor = B.green; e.currentTarget.style.boxShadow = `0 4px 16px ${B.green}25`; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = B.cream; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div className="h-28 flex items-center justify-center relative" style={{ background: B.cream }}>
        {producto.imagen
          ? <Image src={producto.imagen} alt={producto.nombre} fill className="object-cover" />
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
  subtotal: number;
  carrito: CartItem[]; cajaId?: string; mesaId?: string;
  onClose: () => void; onSuccess: () => void;
}

function ModalCobro({ subtotal, carrito, cajaId, mesaId, onClose, onSuccess }: ModalCobroProps) {
  const { usuario } = useAuth();
  const { clientes, refetchClientes, refetchVentas, refetchVentasRecientes, refetchProductos } = useGlobalData();

  const [metodo,        setMetodo]        = useState<MetodoPago>('efectivo');
  const [tipo,          setTipo]          = useState<TipoComprobante>('boleta');
  const [efectivo,      setEfectivo]      = useState('');
  const [descuento,     setDescuento]     = useState('');
  const [multa,         setMulta]         = useState('');
  const [query,         setQuery]         = useState('');
  const [cliente,       setCliente]       = useState<Cliente | null>(CLIENTE_GENERAL);
  const [mostrarLista,  setMostrarLista]  = useState(false);
  const [modalRegistro, setModalRegistro] = useState(false);
  const [procesando,    setProcesando]    = useState(false);
  const [exito,         setExito]         = useState(false);
  const [error,         setError]         = useState('');

  const descVal    = parseFloat(descuento) || 0;
  const multaVal   = parseFloat(multa) || 0;
  const baseTotal  = subtotal - descVal + multaVal;
  const igvReal    = tipo !== 'nota_venta' ? baseTotal * 0.18 : 0;
  const totalFinal = baseTotal + igvReal;

  const vuelto = metodo === 'efectivo'
    ? Math.max(0, parseFloat(efectivo || '0') - totalFinal) : 0;
  const puedeConfirmar = metodo !== 'efectivo' || parseFloat(efectivo || '0') >= totalFinal;

  // Búsqueda local de clientes
  const resultadosCliente = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return clientes
      .filter(c =>
        c.nombre.toLowerCase().includes(lower) ||
        (c.dni ?? '').includes(lower) ||
        (c.ruc ?? '').includes(lower)
      )
      .slice(0, 6);
  }, [query, clientes]);

  const mostrarResultados = mostrarLista && query.trim().length > 0;

  const handleTipoComp = (nuevo: TipoComprobante) => {
    setTipo(nuevo);
    if (nuevo === 'factura') {
      setCliente(null); // factura requiere cliente real con RUC
    } else {
      // si no hay cliente seleccionado, volver al general
      setCliente(prev => (prev === null ? CLIENTE_GENERAL : prev));
    }
  };

  const handleConfirmar = async () => {
    if (!puedeConfirmar || !usuario) return;
    if (tipo === 'factura' && (!cliente || cliente.id === '__general__')) {
      setError('Para factura debes seleccionar un cliente con RUC.'); return;
    }
    setProcesando(true); setError('');
    try {
      await crearVenta({
        items:            carrito,
        tipo_comprobante: tipo,
        metodo_pago:      metodo,
        caja_id:          cajaId,
        mesa_id:          mesaId,
        cliente_id:       (cliente && cliente.id !== '__general__') ? cliente.id : undefined,
        monto_recibido:   efectivo ? parseFloat(efectivo) : undefined,
        descuento_monto:  descVal > 0 ? descVal : undefined,
        notas:            multaVal > 0 ? `Multa por daños: S/ ${multaVal.toFixed(2)}` : undefined,
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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={!procesando ? onClose : undefined}>
        <div className="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
          style={{ background: B.white, maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: B.cream }}>
            <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Procesar Venta</h2>
            {!procesando && (
              <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
                onMouseEnter={e => e.currentTarget.style.background = B.cream}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-6 space-y-4">
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
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>Tipo de comprobante</p>
                  <div className="grid grid-cols-3 gap-2">
                    {COMPROBANTES_PV.map(c => {
                      const activo = tipo === c.id;
                      return (
                        <button key={c.id} onClick={() => handleTipoComp(c.id)}
                          className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-semibold"
                          style={{
                            background: activo ? '#7C3AED' : B.cream,
                            color: activo ? '#fff' : B.charcoal,
                            border: `1px solid ${activo ? '#7C3AED' : B.creamDark}`,
                          }}>
                          <span className="font-bold">{c.label}</span>
                          <span className="text-[9px] opacity-70">{c.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cliente */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>
                    Cliente {tipo === 'factura' ? '(obligatorio)' : '(opcional)'}
                  </p>
                  {cliente ? (
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ background: B.cream, border: `1px solid ${B.creamDark}` }}>
                      <div className="flex items-center gap-2 min-w-0">
                        {cliente.id === '__general__'
                          ? <UserCircle className="w-4 h-4 shrink-0" style={{ color: B.muted }} />
                          : <Users className="w-4 h-4 shrink-0" style={{ color: B.green }} />}
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate"
                            style={{ color: cliente.id === '__general__' ? B.muted : B.charcoal }}>
                            {cliente.nombre}
                          </p>
                          {cliente.id !== '__general__' && (
                            <p className="text-xs" style={{ color: B.muted }}>
                              {cliente.ruc ? `RUC: ${cliente.ruc}` : cliente.dni ? `DNI: ${cliente.dni}` : 'Sin documento'}
                            </p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setCliente(null)}
                        className="p-1.5 rounded-lg shrink-0 ml-2" style={{ color: B.muted }}
                        title="Cambiar cliente"
                        onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
                        <input type="text" value={query}
                          onChange={e => { setQuery(e.target.value); setMostrarLista(true); }}
                          onFocus={() => query.trim() && setMostrarLista(true)}
                          onBlur={() => setTimeout(() => setMostrarLista(false), 150)}
                          placeholder={tipo === 'factura' ? 'Buscar por nombre o RUC...' : 'Buscar cliente...'}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
                        {mostrarResultados && resultadosCliente.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 rounded-xl shadow-lg overflow-hidden"
                            style={{ background: B.white, border: `1px solid ${B.creamDark}` }}>
                            {resultadosCliente.map(c => (
                              <button key={c.id}
                                onMouseDown={() => { setCliente(c); setQuery(''); setMostrarLista(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm"
                                style={{ color: B.charcoal }}
                                onMouseEnter={e => e.currentTarget.style.background = B.cream}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div>
                                  <p className="font-semibold">{c.nombre}</p>
                                  <p className="text-[10px]" style={{ color: B.muted }}>
                                    {c.ruc ? `RUC: ${c.ruc}` : c.dni ? `DNI: ${c.dni}` : ''}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {mostrarResultados && query.trim() && resultadosCliente.length === 0 && (
                          <div className="absolute z-20 w-full mt-1 rounded-xl px-4 py-3 text-sm"
                            style={{ background: B.white, border: `1px solid ${B.creamDark}`, color: B.muted }}>
                            Sin resultados para &ldquo;{query}&rdquo;
                          </div>
                        )}
                      </div>
                      {/* Botones: cliente general + nuevo cliente */}
                      <div className="flex gap-2">
                        <button onClick={() => setCliente(CLIENTE_GENERAL)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl flex-1 justify-center"
                          style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}
                          onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
                          onMouseLeave={e => e.currentTarget.style.background = B.cream}>
                          <UserCircle className="w-3.5 h-3.5" /> Cliente General
                        </button>
                        <button onClick={() => setModalRegistro(true)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl flex-1 justify-center"
                          style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}
                          onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
                          onMouseLeave={e => e.currentTarget.style.background = B.cream}>
                          <UserPlus className="w-3.5 h-3.5" /> Nuevo cliente
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumen + descuento + multa */}
                <div className="rounded-xl p-4 space-y-2" style={{ background: B.cream }}>
                  <div className="flex justify-between text-sm" style={{ color: B.charcoal }}>
                    <span>Subtotal</span><span>S/ {subtotal.toFixed(2)}</span>
                  </div>
                  {/* Descuento */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm flex items-center gap-1.5 font-semibold" style={{ color: '#16a34a' }}>
                      🏷️ Descuento (S/.)
                    </span>
                    <input type="number" min="0" placeholder="0.00" value={descuento}
                      onChange={e => setDescuento(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-lg text-sm outline-none text-right"
                      style={{ background: B.white, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
                  </div>
                  {/* Multa */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm flex items-center gap-1.5 font-semibold" style={{ color: '#b45309' }}>
                      ⚠️ Multa daños (S/.)
                    </span>
                    <input type="number" min="0" placeholder="0.00" value={multa}
                      onChange={e => setMulta(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-lg text-sm outline-none text-right"
                      style={{ background: B.white, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
                  </div>
                  <div className="border-t pt-2" style={{ borderColor: B.creamDark }}>
                    {tipo !== 'nota_venta' && (
                      <div className="flex justify-between text-sm" style={{ color: B.muted }}>
                        <span>IGV (18%)</span><span>S/ {igvReal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-black mt-1" style={{ color: B.charcoal }}>
                      <span>Total</span>
                      <span style={{ color: '#7C3AED' }}>S/ {totalFinal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Método de pago */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>Método de pago</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {METODOS_PAGO_COMPLETOS.map(m => {
                      const activo = metodo === m.key;
                      return (
                        <button key={m.key} onClick={() => setMetodo(m.key)}
                          className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-semibold"
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
                {metodo === 'efectivo' && (
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest block mb-1.5" style={{ color: B.muted }}>
                      Efectivo recibido (S/.)
                    </label>
                    <input type="number" value={efectivo} onChange={e => setEfectivo(e.target.value)}
                      placeholder={`Mínimo S/ ${totalFinal.toFixed(2)}`} autoFocus
                      className="w-full px-4 py-3 rounded-xl text-lg font-bold outline-none"
                      style={{
                        background: B.cream,
                        border: `2px solid ${puedeConfirmar || !efectivo ? B.creamDark : B.terra}`,
                        color: B.charcoal,
                      }} />
                    {efectivo && parseFloat(efectivo) >= totalFinal && (
                      <div className="mt-2 flex justify-between text-sm font-bold" style={{ color: B.green }}>
                        <span>Vuelto</span><span>S/ {vuelto.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="px-3 py-2 rounded-xl text-sm flex items-center gap-2"
                    style={{ background: '#fef0e6', color: B.terra }}>
                    ⚠️ {error}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!exito && (
            <div className="px-6 pb-6 pt-4 flex gap-3 shrink-0 border-t" style={{ borderColor: B.cream }}>
              <button onClick={onClose} disabled={procesando}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
              <button onClick={handleConfirmar} disabled={!puedeConfirmar || procesando}
                className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: puedeConfirmar ? '#7C3AED' : B.muted, color: '#fff' }}>
                {procesando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                  : <><CheckCircle className="w-4 h-4" /> Confirmar Venta</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal registro cliente — z-index mayor que el cobro */}
      {modalRegistro && (
        <ModalRegistrarClientePV
          tipoComprobante={tipo}
          onClose={() => setModalRegistro(false)}
          onRegistrado={(c) => {
            setCliente(c);
            setModalRegistro(false);
            refetchClientes();
          }}
        />
      )}
    </>
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

  const productosVenta = useMemo(() =>
    productos.filter(p => p.tipo === 'producto_venta' && p.activo),
  [productos]);

  const categorias = useMemo(() => {
    const cats = [...new Set(productosVenta.map(p => p.categoria))].sort();
    return ['Todos', ...cats];
  }, [productosVenta]);

  const filtrados = useMemo(() => productosVenta.filter(p => {
    const matchQ   = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchCat = categoria === 'Todos' || p.categoria === categoria;
    return matchQ && matchCat;
  }), [productosVenta, busqueda, categoria]);

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
          subtotal={subtotal}
          carrito={carrito}
          cajaId={usuario?.caja_id ?? undefined}
          onClose={() => setModalCobro(false)}
          onSuccess={() => { setModalCobro(false); setCarrito([]); }}
        />
      )}
    </div>
  );
}