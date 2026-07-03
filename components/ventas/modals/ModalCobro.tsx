// components/ventas/modals/ModalCobro.tsx
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { B } from '@/lib/brand';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { crearVenta } from '@/lib/supabase/queries';
import { imprimirComprobanteDeVenta } from '@/utils/comprobantes/comprobantesUtils';
import {
  METODOS_PAGO, COMPROBANTES, COLOR_VENTA,
  getClienteGeneral, esClienteGeneral,
} from '@/constants/ventas/ventasConstants';
import { SelectorCliente } from '../SelectorCliente';
import { ModalCliente } from '@/components/clientes/modals/ModalCliente';
import type { CartItem, MetodoPago, TipoComprobante, Cliente } from '@/lib/supabase/types';

interface ModalCobroProps {
  subtotal:  number;   // suma de (precio × cantidad), precios YA incluyen IGV
  carrito:   CartItem[];
  cajaId?:   string;
  mesaId?:   string;
  onClose:   () => void;
  onSuccess: () => void;
}

export function ModalCobro({
  subtotal, carrito, cajaId, mesaId, onClose, onSuccess,
}: ModalCobroProps) {
  const { usuario } = useAuth();
  const {
    refetchClientes, refetchVentas, refetchVentasRecientes, refetchProductos, clientes,
  } = useGlobalData();

  const [metodo,        setMetodo]        = useState<MetodoPago>('efectivo');
  const [tipo,          setTipo]          = useState<TipoComprobante>('boleta');
  const [efectivo,      setEfectivo]      = useState('');
  const [descuento,     setDescuento]     = useState('');
  const [multa,         setMulta]         = useState('');

  // ── Estado tri-valor del cliente elegido por el usuario ────────────────────
  // undefined → el usuario aún no decidió nada: se aplica el default
  //             (Cliente General real) automáticamente.
  // null      → el usuario presionó la "X" para QUITAR el cliente a propósito:
  //             debe mostrarse el buscador vacío, SIN auto-rellenar de nuevo.
  // Cliente   → el usuario eligió explícitamente uno (general o real).
  const [clienteElegido, setClienteElegido] = useState<Cliente | null | undefined>(undefined);

  const [modalRegistro, setModalRegistro]   = useState(false);
  const [procesando,    setProcesando]      = useState(false);
  const [exito,         setExito]           = useState(false);
  const [imprimiendo,   setImprimiendo]     = useState(false);
  const [error,         setError]           = useState('');

  // ── Cliente EFECTIVO a mostrar/usar ────────────────────────────────────────
  // Solo aplica el default automático cuando clienteElegido === undefined
  // (el usuario no ha decidido nada todavía). Si es null (lo quitó con la X)
  // se respeta esa decisión y se deja vacío para que pueda elegir otro.
  // Para "factura" nunca hay default automático: siempre debe elegirse.
  const clienteEfectivo = useMemo(() => {
    if (clienteElegido !== undefined) return clienteElegido; // null o Cliente: respetar
    if (tipo === 'factura') return null;
    return getClienteGeneral(clientes);
  }, [clienteElegido, tipo, clientes]);

  // ── Cálculos ──────────────────────────────────────────────────────────────
  // Los precios YA incluyen IGV → total = lo que paga el cliente.
  // IGV se desglosa: igv = total − total/1.18
  const descVal    = parseFloat(descuento) || 0;
  const multaVal   = parseFloat(multa) || 0;
  const totalFinal = Math.max(0, subtotal - descVal + multaVal);

  // Para nota_venta no se muestra desglose de IGV
  const igvDesglosado = tipo !== 'nota_venta'
    ? parseFloat((totalFinal - totalFinal / 1.18).toFixed(2))
    : 0;
  const baseImponible = parseFloat((totalFinal / 1.18).toFixed(2));

  const vuelto = metodo === 'efectivo'
    ? Math.max(0, parseFloat(efectivo || '0') - totalFinal)
    : 0;
  const puedeConfirmar =
    metodo !== 'efectivo' || parseFloat(efectivo || '0') >= totalFinal;

  // ── Cambio de tipo de comprobante ─────────────────────────────────────────
  const handleTipoComp = useCallback((nuevo: TipoComprobante) => {
    setTipo(nuevo);
    if (nuevo === 'factura') {
      // Factura siempre exige elegir explícitamente (sin default automático)
      setClienteElegido(null);
    } else {
      // Al volver de factura (o si ya estaba en null por una X previa),
      // se reactiva el default automático — EXCEPTO si el usuario ya había
      // elegido un cliente real concreto, en cuyo caso se conserva.
      setClienteElegido((prev) => prev ?? undefined);
    }
  }, []);

  // ── Confirmar venta ───────────────────────────────────────────────────────
  const handleConfirmar = useCallback(async () => {
    if (!puedeConfirmar || !usuario) return;
    if (tipo === 'factura' && (!clienteEfectivo || esClienteGeneral(clienteEfectivo))) {
      setError('Para factura debes seleccionar un cliente con RUC.');
      return;
    }
    setProcesando(true);
    setError('');
    try {
      const venta = await crearVenta(
        {
          items:            carrito,
          tipo_comprobante: tipo,
          metodo_pago:      metodo,
          caja_id:          cajaId,
          mesa_id:          mesaId,
          // Siempre se guarda el cliente real, incluido el General.
          cliente_id:       clienteEfectivo ? clienteEfectivo.id : undefined,
          monto_recibido:   efectivo ? parseFloat(efectivo) : undefined,
          descuento_monto:  descVal > 0 ? descVal : undefined,
          notas:            multaVal > 0 ? `Multa por daños: S/ ${multaVal.toFixed(2)}` : undefined,
        },
        usuario.id,
      );
      setExito(true);
      void Promise.all([refetchVentas(), refetchVentasRecientes(), refetchProductos()]);

      // ── Impresión automática del comprobante recién generado ──────────────
      // No bloquea el cierre del modal: si la impresora/popup falla, la venta
      // ya quedó registrada y el cajero siempre puede reimprimir desde Comprobantes.
      setImprimiendo(true);
      imprimirComprobanteDeVenta(venta.id)
        .catch(e => console.error('No se pudo imprimir el comprobante automáticamente:', e))
        .finally(() => setImprimiendo(false));

      setTimeout(() => { onSuccess(); }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar la venta');
    } finally {
      setProcesando(false);
    }
  }, [
    puedeConfirmar, usuario, tipo, clienteEfectivo, carrito, metodo,
    cajaId, mesaId, efectivo, descVal, multaVal,
    refetchVentas, refetchVentasRecientes, refetchProductos, onSuccess,
  ]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={!procesando ? onClose : undefined}
      >
        <div
          className="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
          style={{ background: B.white, maxHeight: '92vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b shrink-0"
            style={{ borderColor: B.cream }}
          >
            <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Procesar Venta</h2>
            {!procesando && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg"
                style={{ color: B.muted }}
                onMouseEnter={(e) => (e.currentTarget.style.background = B.cream)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
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
                <p className="text-sm" style={{ color: B.muted }}>
                  {imprimiendo ? 'Generando comprobante para imprimir…' : 'Comprobante generado correctamente'}
                </p>
                {imprimiendo && (
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: B.muted }} />
                )}
              </div>
            ) : (
              <>
                {/* Tipo comprobante */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>
                    Tipo de comprobante
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {COMPROBANTES.map((c) => {
                      const activo = tipo === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleTipoComp(c.id)}
                          className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-semibold"
                          style={{
                            background: activo ? COLOR_VENTA : B.cream,
                            color:      activo ? '#fff'      : B.charcoal,
                            border:     `1px solid ${activo ? COLOR_VENTA : B.creamDark}`,
                          }}
                        >
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
                  <SelectorCliente
                    cliente={clienteEfectivo}
                    tipoComprobante={tipo}
                    onClienteChange={setClienteElegido}
                    onNuevoCliente={() => setModalRegistro(true)}
                  />
                </div>

                {/* Resumen + descuento + multa */}
                <div className="rounded-xl p-4 space-y-2" style={{ background: B.cream }}>
                  <div className="flex justify-between text-sm" style={{ color: B.charcoal }}>
                    <span>Subtotal (sin IGV)</span>
                    <span>S/ {baseImponible.toFixed(2)}</span>
                  </div>
                  {/* Descuento */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm flex items-center gap-1.5 font-semibold" style={{ color: '#16a34a' }}>
                      🏷️ Descuento (S/.)
                    </span>
                    <input
                      type="number" min="0" placeholder="0.00" value={descuento}
                      onChange={(e) => setDescuento(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-lg text-sm outline-none text-right"
                      style={{ background: B.white, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
                    />
                  </div>
                  {/* Multa */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm flex items-center gap-1.5 font-semibold" style={{ color: '#b45309' }}>
                      ⚠️ Multa daños (S/.)
                    </span>
                    <input
                      type="number" min="0" placeholder="0.00" value={multa}
                      onChange={(e) => setMulta(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-lg text-sm outline-none text-right"
                      style={{ background: B.white, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
                    />
                  </div>
                  <div className="border-t pt-2" style={{ borderColor: B.creamDark }}>
                    {tipo !== 'nota_venta' && (
                      <div className="flex justify-between text-sm" style={{ color: B.muted }}>
                        <span>IGV (18% incl.)</span>
                        <span>S/ {igvDesglosado.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-black mt-1" style={{ color: B.charcoal }}>
                      <span>Total</span>
                      <span style={{ color: COLOR_VENTA }}>S/ {totalFinal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Método de pago */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: B.muted }}>
                    Método de pago
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {METODOS_PAGO.map((m) => {
                      const activo = metodo === m.key;
                      return (
                        <button
                          key={m.key}
                          onClick={() => setMetodo(m.key)}
                          className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-semibold"
                          style={{
                            background: activo ? COLOR_VENTA : B.cream,
                            color:      activo ? '#fff'      : B.charcoal,
                            border:     `1px solid ${activo ? COLOR_VENTA : B.creamDark}`,
                          }}
                        >
                          <m.icon className="w-4 h-4" />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Efectivo recibido */}
                {metodo === 'efectivo' && (
                  <div>
                    <label
                      className="text-xs font-black uppercase tracking-widest block mb-1.5"
                      style={{ color: B.muted }}
                    >
                      Efectivo recibido (S/.)
                    </label>
                    <input
                      type="number"
                      value={efectivo}
                      onChange={(e) => setEfectivo(e.target.value)}
                      placeholder={`Mínimo S/ ${totalFinal.toFixed(2)}`}
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl text-lg font-bold outline-none"
                      style={{
                        background: B.cream,
                        border: `2px solid ${puedeConfirmar || !efectivo ? B.creamDark : B.terra}`,
                        color: B.charcoal,
                      }}
                    />
                    {efectivo && parseFloat(efectivo) >= totalFinal && (
                      <div className="mt-2 flex justify-between text-sm font-bold" style={{ color: B.green }}>
                        <span>Vuelto</span>
                        <span>S/ {vuelto.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div
                    className="px-3 py-2 rounded-xl text-sm flex items-center gap-2"
                    style={{ background: '#fef0e6', color: B.terra }}
                  >
                    ⚠️ {error}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!exito && (
            <div
              className="px-6 pb-6 pt-4 flex gap-3 shrink-0 border-t"
              style={{ borderColor: B.cream }}
            >
              <button
                onClick={onClose}
                disabled={procesando}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: B.cream, color: B.charcoal }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={!puedeConfirmar || procesando}
                className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: puedeConfirmar ? COLOR_VENTA : B.muted, color: '#fff' }}
              >
                {procesando ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Confirmar Venta</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal registro cliente — z-index mayor */}
      {modalRegistro && (
        <ModalCliente
          cliente={null}
          onClose={() => setModalRegistro(false)}
          onSaved={(c) => {
            if (c) setClienteElegido(c);
            setModalRegistro(false);
            refetchClientes();
          }}
        />
      )}
    </>
  );
}