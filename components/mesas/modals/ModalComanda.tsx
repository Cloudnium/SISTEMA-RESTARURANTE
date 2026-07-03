// components/mesas/modals/ModalComanda.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import {
  X, Loader2, Receipt, CheckCircle, RefreshCw,
  Users, ShoppingCart, Tag, AlertTriangle, Package,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { supabase } from '@/lib/supabase/client';
import {
  getPedidoActivoMesa,
  crearVenta,
} from '@/lib/supabase/queries';
import { imprimirComprobanteDeVenta } from '@/utils/comprobantes/comprobantesUtils';
import { useGlobalData } from '@/context/GlobalDataContext';
import type {
  Pedido, PedidoItem, Cliente,
  TipoComprobante, MetodoPago, CrearVentaPayload, CartItem,
} from '@/lib/supabase/types';
import { METODOS_PAGO, COMPROBANTES } from '@/constants/mesas/mesasConstants';
import { getClienteGeneral, esClienteGeneral } from '@/constants/ventas/ventasConstants';
import { fmtSoles, type MesaRow } from '@/utils/mesas/mesasUtils';
import SelectorCliente from '../SelectorCliente';
import { ModalCliente } from '@/components/clientes/modals/ModalCliente';

interface Props {
  mesa:        MesaRow;
  onClose:     () => void;
  onPagado:    () => void;
  usuarioId:   string;
  cajaId?:     string;
  cajaAbierta: boolean;
}

export default function ModalComanda({ mesa, onClose, onPagado, usuarioId, cajaId, cajaAbierta }: Props) {
  const { refetchClientes, clientes } = useGlobalData();

  const [pedido,        setPedido]        = useState<Pedido | null>(null);
  const [cargando,      setCargando]      = useState(true);
  const [procesando,    setProcesando]    = useState(false);
  const [exito,         setExito]         = useState(false);
  const [imprimiendo,   setImprimiendo]   = useState(false);
  const [error,         setError]         = useState('');
  const [modalRegistro, setModalRegistro] = useState(false);

  const [tipoComp,   setTipoComp]   = useState<TipoComprobante>('boleta');

  // ── Estado tri-valor del cliente elegido por el usuario ────────────────────
  // undefined → aún no decidió nada: se aplica el "Cliente General" real
  //             de la BD automáticamente.
  // null      → presionó la "X" a propósito: se respeta, no se auto-rellena.
  // Cliente   → eligió explícitamente uno (general o real).
  const [clienteElegido, setClienteElegido] = useState<Cliente | null | undefined>(undefined);

  const [descuento,  setDescuento]  = useState('');
  const [multa,      setMulta]      = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [efectivo,   setEfectivo]   = useState('');

  // ── Cliente EFECTIVO a mostrar/usar ────────────────────────────────────────
  // Calculado con useMemo: nunca llama setState, así que no hay riesgo de
  // efectos en cascada. Para "factura" nunca hay default automático.
  const cliente = useMemo(() => {
    if (clienteElegido !== undefined) return clienteElegido; // null o Cliente: respetar
    if (tipoComp === 'factura') return null;
    return getClienteGeneral(clientes);
  }, [clienteElegido, tipoComp, clientes]);

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

  useEffect(() => { cargarPedido(); }, [cargarPedido]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  
  useEffect(() => {
    const channel = supabase
      .channel(`comanda-mesa-${mesa.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, () => cargarPedido())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pedidos',
        filter: `mesa_id=eq.${mesa.id}`,
      }, () => cargarPedido())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mesa.id, cargarPedido]);

  // ── Cambio de tipo de comprobante ─────────────────────────────────────────
  const handleTipoComp = (nuevo: TipoComprobante) => {
    setTipoComp(nuevo);
    if (nuevo === 'factura') {
      // Factura siempre exige elegir explícitamente (sin default automático)
      setClienteElegido(null);
    } else {
      // Al volver de factura, se reactiva el default automático — excepto
      // si el usuario ya había elegido un cliente real concreto.
      setClienteElegido((prev) => prev ?? undefined);
    }
  };

  const handleClienteRegistrado = (c?: Cliente) => {
    if (c) setClienteElegido(c);
    setModalRegistro(false);
    refetchClientes();
  };

  const handleLimpiarCliente = () => setClienteElegido(null);

  // ── Cálculos ──────────────────────────────────────────────────────────────
  // Los precios del pedido YA incluyen IGV.
  // total = subtotal_pedido − descuento + multa  → lo que paga el cliente
  // IGV se desglosa hacia atrás: igv = total − total/1.18
  const items: PedidoItem[] = pedido?.items ?? [];
  const subtotalPedido = items.reduce((s, i) => s + i.subtotal, 0);
  const descVal  = parseFloat(descuento) || 0;
  const multaVal = parseFloat(multa) || 0;
  const total    = Math.max(0, subtotalPedido - descVal + multaVal);
  const igv      = tipoComp !== 'nota_venta'
    ? parseFloat((total - total / 1.18).toFixed(2))
    : 0;

  const vuelto = metodoPago === 'efectivo'
    ? Math.max(0, (parseFloat(efectivo) || 0) - total)
    : null;

  // ── Confirmar pago ────────────────────────────────────────────────────────
  const confirmarPago = async () => {
    if (!cajaAbierta) {
      setError('Debes abrir tu caja antes de procesar un pago.');
      return;
    }
    if (tipoComp === 'factura' && (!cliente || esClienteGeneral(cliente))) {
      setError('Para factura debes seleccionar o registrar un cliente con RUC.');
      return;
    }
    setProcesando(true);
    setError('');

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
      // Siempre se guarda el cliente real, incluido el General.
      cliente_id:       cliente ? cliente.id : undefined,
      caja_id:          cajaId ?? undefined,
      mesa_id:          mesa.id,
      monto_recibido:   metodoPago === 'efectivo' ? (parseFloat(efectivo) || undefined) : undefined,
      descuento_monto:  descVal > 0 ? descVal : undefined,
      notas:            multaVal > 0 ? `Multa por daños: S/ ${multaVal.toFixed(2)}` : undefined,
    };

    try {
      const venta = await crearVenta(payload, usuarioId);
      setExito(true);

      // ── Impresión automática del comprobante recién generado ──────────────
      // No bloquea el cierre del modal: si la impresora/popup falla, la venta
      // ya quedó registrada y el cajero siempre puede reimprimir desde Comprobantes.
      setImprimiendo(true);
      imprimirComprobanteDeVenta(venta.id)
        .catch(e => console.error('No se pudo imprimir el comprobante automáticamente:', e))
        .finally(() => setImprimiendo(false));

      setTimeout(() => { onPagado(); }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el pago');
      setProcesando(false);
    }
  };

  // Dos columnas para los items
  const col1 = items.filter((_, i) => i % 2 === 0);
  const col2 = items.filter((_, i) => i % 2 === 1);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4"
        style={{ background: 'rgba(20,20,30,0.70)', backdropFilter: 'blur(5px)' }}
        onClick={!procesando ? onClose : undefined}
      >
        <div
          className="rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col"
          style={{ background: B.white, maxHeight: '94vh', maxWidth: 680 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 sm:px-6 py-4 shrink-0"
            style={{ borderBottom: `1px solid ${B.cream}` }}
          >
            <h2
              className="text-base sm:text-lg font-bold flex items-center gap-2"
              style={{ color: B.charcoal }}
            >
              <Receipt className="w-5 h-5 shrink-0" style={{ color: '#7C3AED' }} />
              Comanda — {mesa.nombre ?? `Mesa ${mesa.numero}`}
            </h2>
            {!exito && (
              <div className="flex items-center gap-2">
                <button
                  onClick={cargarPedido}
                  className="p-1.5 rounded-lg"
                  style={{ color: B.muted }}
                  title="Actualizar"
                  onMouseEnter={e => e.currentTarget.style.background = B.cream}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg"
                  style={{ color: B.muted }}
                  onMouseEnter={e => e.currentTarget.style.background = B.cream}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Aviso caja cerrada */}
          {!exito && !cajaAbierta && (
            <div
              className="mx-5 sm:mx-6 mt-4 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold shrink-0"
              style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}
            >
              🔒 Tu caja está cerrada. Ábrela para poder confirmar el pago.
            </div>
          )}

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4">
            {exito ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <CheckCircle className="w-16 h-16" style={{ color: B.green }} />
                <p className="text-lg font-bold" style={{ color: B.charcoal }}>¡Venta registrada!</p>
                <p className="text-sm" style={{ color: B.muted }}>
                  {imprimiendo ? 'Generando comprobante para imprimir…' : 'Comprobante generado correctamente'}
                </p>
                {imprimiendo && (
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: B.muted }} />
                )}
              </div>
            ) : (
              <>
                {cargando && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: B.green }} />
                  </div>
                )}

                {!cargando && !pedido && (
                  <div
                    className="flex flex-col items-center gap-3 py-10 rounded-2xl"
                    style={{ background: B.cream }}
                  >
                    <Package className="w-10 h-10" style={{ color: B.muted }} />
                    <p className="text-sm font-semibold" style={{ color: B.muted }}>
                      No hay pedido activo en esta mesa
                    </p>
                    <p className="text-xs" style={{ color: B.muted }}>
                      Los productos aparecerán aquí cuando se registre un pedido
                    </p>
                  </div>
                )}

                {!cargando && pedido && (
                  <>
                    {/* Tipo comprobante */}
                    <div>
                      <p
                        className="text-xs font-black uppercase tracking-widest mb-2"
                        style={{ color: B.muted }}
                      >
                        Tipo de comprobante
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {COMPROBANTES.map(c => {
                          const activo = tipoComp === c.id;
                          return (
                            <button
                              key={c.id}
                              onClick={() => handleTipoComp(c.id)}
                              className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-semibold transition-all"
                              style={{
                                background: activo ? '#7C3AED' : B.cream,
                                color:      activo ? '#fff' : B.charcoal,
                                border:     `1px solid ${activo ? '#7C3AED' : B.creamDark}`,
                              }}
                            >
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
                      <p
                        className="text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2"
                        style={{ color: B.muted }}
                      >
                        <Users className="w-3.5 h-3.5" />
                        {tipoComp === 'factura'
                          ? 'Cliente / Empresa (obligatorio)'
                          : 'Cliente (opcional)'}
                      </p>
                      <SelectorCliente
                        clienteSeleccionado={cliente}
                        onSeleccionar={c => c ? setClienteElegido(c) : handleLimpiarCliente()}
                        tipoComprobante={tipoComp}
                        onAbrirRegistro={() => setModalRegistro(true)}
                      />
                    </div>

                    {/* Productos */}
                    <div className="rounded-2xl p-4" style={{ background: B.cream }}>
                      <p
                        className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2"
                        style={{ color: B.charcoal }}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Productos del pedido
                        <span className="ml-auto font-normal text-[10px]" style={{ color: B.muted }}>
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </span>
                      </p>
                      {items.length === 0 ? (
                        <p className="text-xs text-center py-4" style={{ color: B.muted }}>
                          Sin productos registrados
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                          {[col1, col2].map((col, ci) => (
                            <div key={ci} className="space-y-1.5">
                              {col.map(p => (
                                <div
                                  key={p.id}
                                  className="flex items-baseline justify-between text-sm gap-2"
                                >
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
                      <button
                        className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl shrink-0"
                        style={{ color: '#16a34a', background: '#dcfce7', border: '1px solid #86efac' }}
                      >
                        <Tag className="w-4 h-4" />Descuento (S/.)
                      </button>
                      <input
                        type="number" min="0" placeholder="0.00"
                        value={descuento} onChange={e => setDescuento(e.target.value)}
                        className="w-24 px-3 py-2 rounded-xl text-sm outline-none text-right"
                        style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
                      />
                      <div className="ml-auto text-right">
                        <span className="text-xs" style={{ color: B.muted }}>Subtotal: </span>
                        <span className="font-bold" style={{ color: B.charcoal }}>{fmtSoles(subtotalPedido)}</span>
                      </div>
                    </div>

                    {/* Multa */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl shrink-0"
                        style={{ color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d' }}
                      >
                        <AlertTriangle className="w-4 h-4" />Multa daños (S/.)
                      </button>
                      <input
                        type="number" min="0" placeholder="0.00"
                        value={multa} onChange={e => setMulta(e.target.value)}
                        className="w-24 px-3 py-2 rounded-xl text-sm outline-none text-right"
                        style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
                      />
                      <div className="ml-auto text-right flex flex-col items-end">
                        {tipoComp !== 'nota_venta' && (
                          <span className="text-[10px]" style={{ color: B.muted }}>
                            IGV incl. (18%): {fmtSoles(igv)}
                          </span>
                        )}
                        <span className="text-xl font-black" style={{ color: '#7C3AED' }}>
                          {fmtSoles(total)}
                        </span>
                      </div>
                    </div>

                    {/* Método de pago */}
                    <div>
                      <p
                        className="text-xs font-black uppercase tracking-widest mb-2"
                        style={{ color: B.muted }}
                      >
                        Método de pago
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {METODOS_PAGO.map(m => {
                          const activo = metodoPago === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => setMetodoPago(m.id)}
                              className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-semibold transition-all"
                              style={{
                                background: activo ? '#7C3AED' : B.cream,
                                color:      activo ? '#fff' : B.charcoal,
                                border:     `1px solid ${activo ? '#7C3AED' : B.creamDark}`,
                              }}
                            >
                              <m.icon className="w-4 h-4" />{m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Efectivo */}
                    {metodoPago === 'efectivo' && (
                      <div className="space-y-2">
                        <p
                          className="text-xs font-black uppercase tracking-widest"
                          style={{ color: B.muted }}
                        >
                          Efectivo recibido (S/.)
                        </p>
                        <input
                          type="number" min="0" placeholder="0.00"
                          value={efectivo} onChange={e => setEfectivo(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
                        />
                        {vuelto !== null && efectivo && (
                          <p className="text-sm" style={{ color: B.muted }}>
                            Vuelto:{' '}
                            <span className="text-xl font-black" style={{ color: '#7C3AED' }}>
                              {fmtSoles(vuelto)}
                            </span>
                          </p>
                        )}
                      </div>
                    )}

                    {error && (
                      <div
                        className="px-4 py-3 rounded-xl text-sm flex items-start gap-2"
                        style={{ background: '#fef0e6', color: B.terra }}
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!exito && (
            <div
              className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 shrink-0"
              style={{ borderTop: `1px solid ${B.cream}` }}
            >
              <button
                onClick={onClose}
                disabled={procesando}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: B.cream, color: B.charcoal }}
              >
                Cancelar
              </button>
              {pedido && (
                <button
                  onClick={cajaAbierta ? confirmarPago : undefined}
                  disabled={procesando || items.length === 0 || !cajaAbierta}
                  title={!cajaAbierta ? 'Debes abrir tu caja antes de cobrar' : undefined}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                  style={{
                    background: cajaAbierta ? '#7C3AED' : B.muted,
                    color:      '#fff',
                    cursor:     cajaAbierta && !procesando ? 'pointer' : 'not-allowed',
                  }}
                >
                  {procesando
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle className="w-4 h-4" />}
                  {cajaAbierta ? 'Confirmar Pago' : '🔒 Caja cerrada'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {modalRegistro && (
        <ModalCliente
          cliente={null}
          onClose={() => setModalRegistro(false)}
          onSaved={handleClienteRegistrado}
        />
      )}
    </>
  );
}