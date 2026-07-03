// components/comprobantes/modals/ModalVerComprobante.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Receipt, X, Download, Ban, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { TIPO_CFG, METODO_LABEL } from '@/constants/comprobantes/comprobantesConstants';
import {
  fmtMoney, fmtFechaSolo, fmtHora, buildPrintHTML,
  numeroALetras, generarCodigoHash, buildQrUrl, buildQrData,
} from '@/utils/comprobantes/comprobantesUtils';
import type { CompDetalle } from '@/constants/comprobantes/comprobantesConstants';

interface Props {
  comp:     CompDetalle;
  onClose:  () => void;
  onAnular: (comprobanteId: string, ventaId: string) => Promise<void>;
}

export function ModalVerComprobante({ comp, onClose, onAnular }: Props) {
  const cfg       = TIPO_CFG[comp.tipo];
  const total     = comp.monto;
  const subtotal  = comp.subtotal ?? total;
  const igv       = comp.igv ?? 0;
  const descuento = comp.descuento_monto ?? 0;
  const fechaSolo = fmtFechaSolo(comp.fecha_emision);
  const horaSolo  = fmtHora(comp.fecha_emision);
  const baseImponible = total / 1.18;
  const igvCalculado  = total - baseImponible;
  const esNota = comp.tipo === 'nota_venta';

  const recibido = comp.monto_recibido ?? total;
  const saldo    = Math.max(0, total - recibido);

  const [confirmando, setConfirmando] = useState(false);
  const [anulando,    setAnulando]    = useState(false);

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=440,height=720');
    if (!w) return;
    w.document.write(buildPrintHTML(comp));
    w.document.close();
    setTimeout(() => w.print(), 350);
  };

  const handleAnular = async () => {
    if (!comp.venta_id) return;
    setAnulando(true);
    try {
      await onAnular(comp.id, comp.venta_id);
      onClose();
    } finally {
      setAnulando(false);
      setConfirmando(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(44,62,53,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md shadow-2xl flex flex-col"
        style={{ background: B.white, maxHeight: 'calc(100dvh - 24px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          className="flex items-center justify-between px-4 sm:px-5 py-4 border-b shrink-0"
          style={{ borderColor: B.cream }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: cfg.bg }}
            >
              <Receipt className="w-4 h-4" style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: B.muted }}>
                {cfg.label}
              </p>
              <p className="text-base font-bold" style={{ color: B.charcoal }}>{comp.numero}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: B.muted }}
            onMouseEnter={e => { e.currentTarget.style.background = B.cream; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recibo visual */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5">
          <div
            className="rounded-xl overflow-hidden w-full"
            style={{
              background: '#fff',
              border: '1px solid #e0e0e0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
              fontFamily: "'Courier New', Courier, monospace",
              maxWidth: 360,
              margin: '0 auto',
            }}
          >
            {/* Encabezado ticket */}
            <div className="px-4 sm:px-5 pt-5 pb-4 text-center" style={{ borderBottom: '2px solid #000' }}>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/icono.png"
                  alt="MADRE · Postres y Café"
                  style={{ width: 140, height: 'auto', filter: 'grayscale(100%) contrast(200%) brightness(0)' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              <div className="mt-2">
                <p className="text-xs font-black tracking-widest text-black uppercase underline">
                  {cfg.headerLabel}
                </p>
                <p className="text-sm font-black text-black tracking-wider mt-1">
                  {comp.numero}
                </p>
                {comp.estado === 'anulado' && (
                  <div className="mt-2 text-sm font-black" style={{ color: B.terra }}>
                    *** ANULADO ***
                  </div>
                )}
              </div>
            </div>

            {/* Fechas y datos */}
            <div className="px-4 sm:px-5 py-3" style={{ borderBottom: '1px dashed #bbb' }}>
              <table className="w-full text-[11px]">
                <tbody>
                  <tr>
                    <td className="py-0.5 font-bold text-black whitespace-nowrap">F. Emisión:</td>
                    <td className="py-0.5 text-gray-800">{fechaSolo}</td>
                    <td className="py-0.5 font-bold text-black text-right whitespace-nowrap">Hora:</td>
                    <td className="py-0.5 text-gray-800 text-right">{horaSolo}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-bold text-black whitespace-nowrap">F. Vencimiento:</td>
                    <td className="py-0.5 text-gray-800" colSpan={3}>{fechaSolo}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-bold text-black whitespace-nowrap">Cliente:</td>
                    <td className="py-0.5 text-gray-800" colSpan={3}>
                      {comp.cliente_nombre ?? 'Cliente General'}
                    </td>
                  </tr>
                  {comp.tipo === 'factura' && comp.ruc && (
                    <tr>
                      <td className="py-0.5 font-bold text-black">RUC:</td>
                      <td className="py-0.5 text-gray-800" colSpan={3}>{comp.ruc}</td>
                    </tr>
                  )}
                  {comp.tipo === 'boleta' && comp.dni && (
                    <tr>
                      <td className="py-0.5 font-bold text-black">DNI:</td>
                      <td className="py-0.5 text-gray-800" colSpan={3}>{comp.dni}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-0.5 font-bold text-black">Cajero:</td>
                    <td className="py-0.5 text-gray-800" colSpan={3}>{comp.usuario_nombre}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Items */}
            <div className="px-4 sm:px-5 py-3" style={{ borderBottom: '1px dashed #bbb' }}>
              <table className="w-full text-[10px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <th className="text-center pb-1 font-black text-black w-8">Cant</th>
                    <th className="text-left pb-1 font-black text-black">Descripción</th>
                    <th className="text-right pb-1 font-black text-black w-14">P.Unit</th>
                    <th className="text-right pb-1 font-black text-black w-14">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {comp.items && comp.items.length > 0
                    ? comp.items.map(item => (
                        <tr key={item.id}>
                          <td className="text-center py-0.5 text-gray-800">{item.cantidad}</td>
                          <td className="text-left py-0.5 text-gray-800 pr-1">
                            {item.producto?.nombre ?? 'Producto'}
                          </td>
                          <td className="text-right py-0.5 text-gray-800">
                            {fmtMoney(item.precio_unitario)}
                          </td>
                          <td className="text-right py-0.5 text-gray-800">
                            {fmtMoney(item.subtotal)}
                          </td>
                        </tr>
                      ))
                    : (
                      <tr>
                        <td colSpan={4} className="text-center py-3 text-[10px]" style={{ color: '#aaa' }}>
                          {comp.itemsLoaded ? '— sin productos registrados —' : '— cargando… —'}
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>

            {/* Totales — Nota de Venta: simple, sin IGV */}
            {esNota && (
              <>
                <div className="px-4 sm:px-5 py-3" style={{ borderBottom: '2px solid #000' }}>
                  {descuento > 0 && (
                    <table className="w-full text-[11px] mb-1">
                      <tbody>
                        <tr>
                          <td className="py-0.5 text-gray-700">Subtotal bruto:</td>
                          <td className="py-0.5 text-right text-gray-700">{fmtMoney(subtotal + descuento)}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 text-gray-700">Descuento:</td>
                          <td className="py-0.5 text-right text-gray-700">- {fmtMoney(descuento)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                  <p className="text-center font-black text-black text-sm">
                    TOTAL A PAGAR: {fmtMoney(total)}
                  </p>
                </div>

                <div className="px-4 sm:px-5 py-3" style={{ borderBottom: '1px dashed #bbb' }}>
                  <p className="text-[10px] font-bold text-black mb-1">PAGOS:</p>
                  <p className="text-[10px] text-gray-800">
                    - {fechaSolo} - {METODO_LABEL[comp.metodo_pago] ?? comp.metodo_pago} - {fmtMoney(recibido)}
                  </p>
                  <p className="text-center font-black text-black text-xs mt-2">
                    SALDO: {fmtMoney(saldo)}
                  </p>
                </div>
              </>
            )}

            {/* Totales — Boleta / Factura: IGV + Son + QR */}
            {!esNota && (
              <>
                <div className="px-4 sm:px-5 py-3" style={{ borderBottom: '1px dashed #bbb' }}>
                  <table className="w-full text-[11px]">
                    <tbody>
                      {descuento > 0 && (
                        <>
                          <tr>
                            <td className="py-0.5 text-gray-700">Subtotal bruto:</td>
                            <td className="py-0.5 text-right text-gray-700">{fmtMoney(subtotal + descuento)}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-gray-700">Descuento:</td>
                            <td className="py-0.5 text-right text-gray-700">- {fmtMoney(descuento)}</td>
                          </tr>
                        </>
                      )}
                      {comp.tipo === 'factura' ? (
                        <>
                          <tr>
                            <td className="py-0.5 text-gray-700">Op. Gravadas:</td>
                            <td className="py-0.5 text-right text-gray-700">{fmtMoney(baseImponible)}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-gray-700">IGV (18%):</td>
                            <td className="py-0.5 text-right text-gray-700">{fmtMoney(igvCalculado)}</td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr>
                            <td className="py-0.5 text-gray-700">Op. Gravadas:</td>
                            <td className="py-0.5 text-right text-gray-700">{fmtMoney(subtotal)}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-gray-700">IGV:</td>
                            <td className="py-0.5 text-right text-gray-700">{fmtMoney(igv)}</td>
                          </tr>
                        </>
                      )}
                      <tr style={{ borderTop: '1px solid #000' }}>
                        <td className="pt-2 font-black text-black text-sm">TOTAL A PAGAR:</td>
                        <td className="pt-2 text-right font-black text-black text-sm">{fmtMoney(total)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-[9px] text-gray-600 mt-2">{numeroALetras(total)}</p>
                </div>

                <div className="px-4 sm:px-5 py-3 flex gap-3 items-start" style={{ borderBottom: '1px dashed #bbb' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={buildQrUrl(buildQrData(comp))}
                    alt="QR"
                    className="shrink-0"
                    style={{ width: 76, height: 76 }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="text-[9px] text-gray-700 leading-relaxed min-w-0">
                    <p className="font-bold text-black">CÓDIGO HASH:</p>
                    <p className="break-all">{generarCodigoHash(comp.id)}</p>
                    <p className="mt-1">
                      <span className="font-bold text-black">CONDICIÓN DE PAGO:</span> Contado
                    </p>
                    <p>
                      <span className="font-bold text-black">PAGOS:</span>{' '}
                      {METODO_LABEL[comp.metodo_pago] ?? comp.metodo_pago} - {fmtMoney(recibido)}
                    </p>
                    <p>
                      <span className="font-bold text-black">VENDEDOR:</span> {comp.usuario_nombre}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Footer ticket */}
            <div className="px-4 sm:px-5 py-4 text-center">
              {comp.notas && (
                <p className="text-[10px] text-gray-600 mb-2">
                  <span className="font-bold">Nota:</span> {comp.notas}
                </p>
              )}
              <p className="text-[9px] text-gray-500 leading-relaxed">
                {comp.tipo === 'boleta'     && 'Representación impresa de la Boleta de Venta Electrónica'}
                {comp.tipo === 'factura'    && 'Representación impresa de la Factura Electrónica'}
                {comp.tipo === 'nota_venta' && 'Representación impresa de la Nota de Venta'}
              </p>
              <p className="text-[10px] font-bold text-black mt-1">¡GRACIAS POR SU COMPRA!</p>
              <p className="text-[9px] text-gray-500">www.madrepostres.pe</p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div
          className="px-4 sm:px-5 py-4 flex flex-col gap-2 border-t shrink-0"
          style={{ borderColor: B.cream }}
        >
          {confirmando && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: '#fff5f5', border: `1px solid ${B.terra}30` }}
            >
              <p className="font-semibold mb-2" style={{ color: B.terra }}>
                ⚠️ ¿Confirmar anulación de {comp.numero}?
              </p>
              <p className="text-xs mb-3" style={{ color: B.muted }}>
                Se revertirá el stock, la caja y los puntos del cliente automáticamente.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmando(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: B.cream, color: B.charcoal }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAnular}
                  disabled={anulando}
                  className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                  style={{ background: B.terra, color: '#fff' }}
                >
                  {anulando
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Ban     className="w-3.5 h-3.5" />}
                  Sí, anular
                </button>
              </div>
            </div>
          )}

          {!confirmando && (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: B.cream, color: B.charcoal }}
              >
                Cerrar
              </button>
              {comp.estado === 'emitido' && comp.venta_id && (
                <button
                  onClick={() => setConfirmando(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5"
                  style={{ background: '#fee2e2', color: B.terra }}
                >
                  <Ban className="w-4 h-4" />
                  <span className="hidden sm:inline">Anular</span>
                </button>
              )}
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: B.charcoal, color: B.cream }}
              >
                <Download className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}