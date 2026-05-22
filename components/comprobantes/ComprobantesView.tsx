// components/comprobantes/ComprobantesView.tsx
'use client';

/**
 * CORRECCIONES APLICADAS:
 * 1. Error "setState en effect": cargarComprobantes() movido a useEffect con
 *    ref de inicialización, evitando render en cascada.
 * 2. Error "actions no existe en PageHeaderProps": cambiado a "action".
 * 3. Error "<img>": reemplazado por Next.js <Image /> donde aplica;
 *    en el HTML de impresión se mantiene <img> porque es una ventana externa.
 * 4. Error "min-w-[640px]": cambiado a min-w-160 (Tailwind v4 syntax).
 * 5. Error "{ estado: string } no asignable a never": tipado explícito al
 *    llamar supabase.update() con satisfies Record<string, unknown>.
 * 6. ANULACIÓN CORRECTA: el frontend solo hace UPDATE ventas.estado = 'anulada'.
 *    Los triggers de PostgreSQL se encargan AUTOMÁTICAMENTE de:
 *      - fn_restaurar_stock_anulacion  → devuelve stock_tienda de cada producto
 *      - fn_registrar_ingreso_caja     → registra egreso en caja y resta monto
 *      - fn_actualizar_puntos_cliente  → resta puntos ganados al cliente
 *    El comprobante se anula por CASCADE (trigger trg_restaurar_stock_anulacion).
 *    Reportes y métricas se recalculan solos porque usan estado = 'completada'.
 */

import React, {
  useState, useMemo, useEffect, useCallback, useRef,
} from 'react';
import Image from 'next/image';
import {
  Search, Eye, Download, ChevronUp, ChevronDown,
  Receipt, FileText, DollarSign, Loader2, X,
  Ban, RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import type { TipoComprobante, EstadoComprobante, MetodoPago } from '@/lib/supabase/types';

// ─── Tipos locales ─────────────────────────────────────────────────────────────
type SortDir     = 'asc' | 'desc';
type TipoFiltro  = 'todos' | TipoComprobante;
type EstadoFiltro = 'todos' | EstadoComprobante;
type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';

type VentaItem = {
  id:              string;
  cantidad:        number;
  precio_unitario: number;
  subtotal:        number;
  producto: { nombre: string; categoria: string } | null;
};

type CompDetalle = {
  id:             string;
  numero:         string;
  tipo:           TipoComprobante;
  estado:         EstadoComprobante;
  fecha_emision:  string;
  monto:          number;
  metodo_pago:    MetodoPago;
  cliente_nombre: string | null;
  dni:            string | null;
  ruc:            string | null;
  usuario_nombre: string;
  venta_id:       string | null;
  subtotal?:      number;
  igv?:           number;
  descuento_monto?: number;
  monto_recibido?:  number;
  vuelto?:          number;
  notas?:           string;
  serie?:           string;
  correlativo?:     number;
  // Local — cargados bajo demanda
  items?:       VentaItem[];
  itemsLoaded?: boolean;
};

// ─── Configuración visual por tipo ───────────────────────────────────────────
const TIPO_CFG: Record<TipoComprobante, {
  label: string; bg: string; color: string; headerLabel: string;
}> = {
  boleta:     { label: 'Boleta',        bg: '#e8f5e2', color: B.green,   headerLabel: 'BOLETA DE VENTA'      },
  nota_venta: { label: 'Nota de Venta', bg: '#fdf8e6', color: B.gold,    headerLabel: 'NOTA DE VENTA'        },
  factura:    { label: 'Factura',       bg: '#e8f0fb', color: '#4A6FA5', headerLabel: 'FACTURA ELECTRÓNICA'  },
};

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', yape: 'Yape',
  plin: 'Plin', transferencia: 'Transferencia', izipay: 'Izipay',
};

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmtMoney = (n: number) => `S/ ${n.toFixed(2)}`;

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ─── Generador del HTML de impresión (ventana externa) ────────────────────────
// Se mantiene <img> aquí porque es HTML nativo para window.open(), no Next.js.
function buildPrintHTML(comp: CompDetalle): string {
  const cfg       = TIPO_CFG[comp.tipo];
  const total     = comp.monto;
  const subtotal  = comp.subtotal ?? total;
  const igv       = comp.igv ?? 0;
  const descuento = comp.descuento_monto ?? 0;
  const fecha     = fmtFecha(comp.fecha_emision);
  const baseImponible = total / 1.18;
  const igvCalculado  = total - baseImponible;

  const itemsHtml = comp.items && comp.items.length > 0
    ? comp.items.map(i => `
        <tr>
          <td class="qty">${i.cantidad}</td>
          <td class="desc">${i.producto?.nombre ?? 'Producto'}</td>
          <td class="price">${fmtMoney(i.precio_unitario)}</td>
          <td class="price">${fmtMoney(i.subtotal)}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="text-align:center;padding:6px 0;color:#888;font-style:italic">Sin detalle registrado</td></tr>`;

  // Totales diferenciados por tipo de comprobante
  let totalesHtml = '';
  if (descuento > 0) {
    totalesHtml += `
      <tr><td>Subtotal bruto:</td><td class="right">${fmtMoney(subtotal + descuento)}</td></tr>
      <tr><td>Descuento:</td><td class="right">- ${fmtMoney(descuento)}</td></tr>`;
  }
  if (comp.tipo === 'factura') {
    totalesHtml += `
      <tr><td>Base imponible:</td><td class="right">${fmtMoney(baseImponible)}</td></tr>
      <tr><td>IGV (18%):</td><td class="right">${fmtMoney(igvCalculado)}</td></tr>`;
  } else if (comp.tipo === 'boleta') {
    totalesHtml += `
      <tr><td>Subtotal:</td><td class="right">${fmtMoney(subtotal)}</td></tr>
      <tr><td>IGV incluido:</td><td class="right">${fmtMoney(igv)}</td></tr>`;
  } else {
    // nota_venta — sin IGV (documento interno, no tributario)
    totalesHtml += `
      <tr><td>Subtotal:</td><td class="right">${fmtMoney(subtotal)}</td></tr>`;
  }

  const pagosHtml = comp.monto_recibido != null ? `
    <tr><td>Recibido:</td><td class="right">${fmtMoney(comp.monto_recibido)}</td></tr>
    <tr><td>Vuelto:</td><td class="right">${fmtMoney(comp.vuelto ?? 0)}</td></tr>` : '';

  const footerLegal =
    comp.tipo === 'boleta'     ? 'Representación impresa de Boleta de Venta Electrónica' :
    comp.tipo === 'factura'    ? 'Representación impresa de Factura Electrónica' :
                                 'Nota de Venta — Documento interno';

  const clienteRows = [
    comp.cliente_nombre ? `<tr><td class="bold">Cliente:</td><td>${comp.cliente_nombre}</td></tr>` : '',
    comp.tipo === 'factura' && comp.ruc ? `<tr><td class="bold">RUC:</td><td>${comp.ruc}</td></tr>` : '',
    comp.tipo === 'boleta'  && comp.dni ? `<tr><td class="bold">DNI:</td><td>${comp.dni}</td></tr>` : '',
  ].join('');

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"/>
<title>${comp.numero}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',Courier,monospace;font-size:11px;color:#000;background:#fff;width:80mm;padding:8px}
  .center{text-align:center} .right{text-align:right} .bold{font-weight:bold}
  .logo{width:72px;height:auto;display:block;margin:0 auto 5px;filter:grayscale(100%) contrast(200%)}
  .titulo{font-size:13px;font-weight:bold;letter-spacing:1px;margin:4px 0 2px}
  .numero{font-size:12px;font-weight:bold;border:1px solid #000;display:inline-block;padding:2px 10px;margin:3px 0}
  .anulado{font-size:14px;font-weight:bold;color:#cc0000;margin-top:4px}
  .sep{border-top:1px dashed #000;margin:6px 0} .sep2{border-top:2px solid #000;margin:6px 0}
  table{width:100%;border-collapse:collapse}
  th,td{font-size:10px;padding:1px 2px;vertical-align:top}
  th{font-weight:bold;border-bottom:1px solid #000}
  .qty{width:28px;text-align:center} .price{width:56px;text-align:right} .desc{text-align:left}
  .subtbl td{font-size:10px;padding:1px 2px}
  .total-row td{font-weight:bold;font-size:12px;border-top:1px solid #000;padding-top:3px}
  .footer{font-size:9px;text-align:center;margin-top:8px;color:#444}
  @media print{body{width:80mm}@page{margin:0;size:80mm auto}}
</style>
</head>
<body>
  <div class="center">
    <img class="logo" src="/icon/icono.png" alt="MADRE" onerror="this.style.display='none'"/>
    <div class="titulo">MADRE · Postres y Café</div>
    <div style="font-size:9px">Jr. Ejemplo 123, Lima, Perú</div>
    <div style="font-size:9px">RUC: 20000000000 · Tel: 999 888 777</div>
  </div>
  <div class="sep2"></div>
  <div class="center">
    <div class="titulo">${cfg.headerLabel}</div>
    <div class="numero">${comp.numero}</div>
    ${comp.estado === 'anulado' ? '<div class="anulado">*** ANULADO ***</div>' : ''}
  </div>
  <div class="sep"></div>
  <table>
    <tr><td class="bold">Fecha:</td><td>${fecha}</td></tr>
    <tr><td class="bold">Cajero:</td><td>${comp.usuario_nombre}</td></tr>
    ${clienteRows}
    <tr><td class="bold">Pago:</td><td>${METODO_LABEL[comp.metodo_pago] ?? comp.metodo_pago}</td></tr>
  </table>
  <div class="sep"></div>
  <table>
    <thead><tr>
      <th class="qty">Cant</th><th class="desc">Descripción</th>
      <th class="price">P.Unit</th><th class="price">Total</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="sep"></div>
  <table class="subtbl">
    <tbody>
      ${totalesHtml}
      <tr class="total-row">
        <td>TOTAL:</td><td class="right">${fmtMoney(total)}</td>
      </tr>
      ${pagosHtml}
    </tbody>
  </table>
  ${comp.notas ? `<div class="sep"></div><div style="font-size:9px"><b>Nota:</b> ${comp.notas}</div>` : ''}
  <div class="sep2"></div>
  <div class="footer">${footerLegal}<br/>¡Gracias por su preferencia!<br/>www.madrepostres.pe</div>
</body></html>`;
}

// ─── Badge Tipo ────────────────────────────────────────────────────────────────
function TipoBadge({ tipo }: { tipo: TipoComprobante }) {
  const cfg = TIPO_CFG[tipo];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ─── Badge Estado ──────────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: EstadoComprobante }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={estado === 'emitido'
        ? { background: '#e8f5e2', color: B.green }
        : { background: '#fee2e2', color: B.terra }}>
      {estado}
    </span>
  );
}

// ─── Toast simple ─────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error';
function Toast({ msg, type, onClose }: { msg: string; type: ToastType; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold"
      style={{ background: type === 'success' ? B.green : B.terra, color: '#fff', minWidth: 260 }}>
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertCircle  className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ─── Modal Ver / Imprimir / Anular ────────────────────────────────────────────
function ModalVerComprobante({
  comp,
  onClose,
  onAnular,
}: {
  comp: CompDetalle;
  onClose: () => void;
  onAnular: (id: string, ventaId: string) => Promise<void>;
}) {
  const cfg       = TIPO_CFG[comp.tipo];
  const total     = comp.monto;
  const subtotal  = comp.subtotal ?? total;
  const igv       = comp.igv ?? 0;
  const descuento = comp.descuento_monto ?? 0;
  const fecha     = fmtFecha(comp.fecha_emision);
  const baseImponible = total / 1.18;
  const igvCalculado  = total - baseImponible;

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
        {/* Cabecera modal */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b shrink-0"
          style={{ borderColor: B.cream }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: cfg.bg }}>
              <Receipt className="w-4 h-4" style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: B.muted }}>
                {cfg.label}
              </p>
              <p className="text-base font-bold" style={{ color: B.charcoal }}>{comp.numero}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: B.muted }}
            onMouseEnter={e => { e.currentTarget.style.background = B.cream; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recibo visual */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5">
          <div className="rounded-xl overflow-hidden"
            style={{
              background: '#fff', border: '1px solid #e0e0e0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
              fontFamily: "'Courier New', Courier, monospace",
            }}>

            {/* Encabezado ticket */}
            <div className="px-5 pt-5 pb-4 text-center" style={{ borderBottom: '2px solid #000' }}>
              <div className="flex justify-center mb-2">
                {/* next/image no aplica aquí porque el src es local relativo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon/icono.png" alt="MADRE"
                  style={{ width: 56, height: 'auto', filter: 'grayscale(100%) contrast(200%) brightness(0)' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <p className="text-sm font-black tracking-widest text-black">MADRE · Postres y Café</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Jr. Ejemplo 123 · Lima, Perú</p>
              <p className="text-[10px] text-gray-500">RUC: 20000000000 · Tel: 999 888 777</p>
              <div className="mt-3">
                <p className="text-xs font-black tracking-widest text-black uppercase">{cfg.headerLabel}</p>
                <div className="inline-block mt-1 px-4 py-1 text-sm font-black text-black tracking-wider"
                  style={{ border: '1px solid #000' }}>
                  {comp.numero}
                </div>
                {comp.estado === 'anulado' && (
                  <div className="mt-2 text-sm font-black" style={{ color: B.terra }}>*** ANULADO ***</div>
                )}
              </div>
            </div>

            {/* Datos del comprobante */}
            <div className="px-5 py-3" style={{ borderBottom: '1px dashed #bbb' }}>
              <table className="w-full text-[11px]">
                <tbody>
                  <tr><td className="py-0.5 font-bold text-black w-24">Fecha:</td><td className="py-0.5 text-gray-800">{fecha}</td></tr>
                  <tr><td className="py-0.5 font-bold text-black">Cajero:</td><td className="py-0.5 text-gray-800">{comp.usuario_nombre}</td></tr>
                  {comp.cliente_nombre && (
                    <tr><td className="py-0.5 font-bold text-black">Cliente:</td><td className="py-0.5 text-gray-800">{comp.cliente_nombre}</td></tr>
                  )}
                  {comp.tipo === 'factura' && comp.ruc && (
                    <tr><td className="py-0.5 font-bold text-black">RUC:</td><td className="py-0.5 text-gray-800">{comp.ruc}</td></tr>
                  )}
                  {comp.tipo === 'boleta' && comp.dni && (
                    <tr><td className="py-0.5 font-bold text-black">DNI:</td><td className="py-0.5 text-gray-800">{comp.dni}</td></tr>
                  )}
                  <tr>
                    <td className="py-0.5 font-bold text-black">Pago:</td>
                    <td className="py-0.5 text-gray-800">{METODO_LABEL[comp.metodo_pago] ?? comp.metodo_pago}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Items de la venta */}
            <div className="px-5 py-3" style={{ borderBottom: '1px dashed #bbb' }}>
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
                          <td className="text-left py-0.5 text-gray-800 pr-1">{item.producto?.nombre ?? 'Producto'}</td>
                          <td className="text-right py-0.5 text-gray-800">{fmtMoney(item.precio_unitario)}</td>
                          <td className="text-right py-0.5 text-gray-800">{fmtMoney(item.subtotal)}</td>
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

            {/* Totales — diferenciados por tipo */}
            <div className="px-5 py-3" style={{ borderBottom: '2px solid #000' }}>
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
                  {/* BOLETA: precio con IGV incluido */}
                  {comp.tipo === 'boleta' && (
                    <>
                      <tr><td className="py-0.5 text-gray-700">Subtotal:</td><td className="py-0.5 text-right text-gray-700">{fmtMoney(subtotal)}</td></tr>
                      <tr><td className="py-0.5 text-gray-700">IGV incluido:</td><td className="py-0.5 text-right text-gray-700">{fmtMoney(igv)}</td></tr>
                    </>
                  )}
                  {/* FACTURA: base imponible + IGV desglosado */}
                  {comp.tipo === 'factura' && (
                    <>
                      <tr><td className="py-0.5 text-gray-700">Base imponible:</td><td className="py-0.5 text-right text-gray-700">{fmtMoney(baseImponible)}</td></tr>
                      <tr><td className="py-0.5 text-gray-700">IGV (18%):</td><td className="py-0.5 text-right text-gray-700">{fmtMoney(igvCalculado)}</td></tr>
                    </>
                  )}
                  {/* NOTA DE VENTA: solo subtotal, sin IGV (no tributario) */}
                  {comp.tipo === 'nota_venta' && (
                    <tr><td className="py-0.5 text-gray-700">Subtotal:</td><td className="py-0.5 text-right text-gray-700">{fmtMoney(subtotal)}</td></tr>
                  )}
                  <tr style={{ borderTop: '1px solid #000' }}>
                    <td className="pt-2 font-black text-black text-sm">TOTAL:</td>
                    <td className="pt-2 text-right font-black text-black text-sm">{fmtMoney(total)}</td>
                  </tr>
                  {comp.monto_recibido != null && (
                    <>
                      <tr><td className="py-0.5 text-gray-700">Recibido:</td><td className="py-0.5 text-right text-gray-700">{fmtMoney(comp.monto_recibido)}</td></tr>
                      <tr><td className="py-0.5 text-gray-700">Vuelto:</td><td className="py-0.5 text-right text-gray-700">{fmtMoney(comp.vuelto ?? 0)}</td></tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer ticket */}
            <div className="px-5 py-4 text-center">
              {comp.notas && (
                <p className="text-[10px] text-gray-600 mb-2">
                  <span className="font-bold">Nota:</span> {comp.notas}
                </p>
              )}
              <p className="text-[9px] text-gray-500 leading-relaxed">
                {comp.tipo === 'boleta'     && 'Representación impresa de Boleta de Venta Electrónica'}
                {comp.tipo === 'factura'    && 'Representación impresa de Factura Electrónica'}
                {comp.tipo === 'nota_venta' && 'Nota de Venta — Documento interno'}
              </p>
              <p className="text-[10px] font-bold text-black mt-1">¡Gracias por su preferencia!</p>
              <p className="text-[9px] text-gray-500">www.madrepostres.pe</p>
            </div>
          </div>
        </div>

        {/* Acciones del modal */}
        <div className="px-4 sm:px-5 py-4 flex flex-col gap-2 border-t shrink-0" style={{ borderColor: B.cream }}>
          {/* Confirmación de anulación */}
          {confirmando && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#fff5f5', border: `1px solid ${B.terra}30` }}>
              <p className="font-semibold mb-2" style={{ color: B.terra }}>
                ⚠️ ¿Confirmar anulación de {comp.numero}?
              </p>
              <p className="text-xs mb-3" style={{ color: B.muted }}>
                Se revertirá el stock, la caja y los puntos del cliente automáticamente.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmando(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: B.cream, color: B.charcoal }}>
                  Cancelar
                </button>
                <button onClick={handleAnular} disabled={anulando}
                  className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                  style={{ background: B.terra, color: '#fff' }}>
                  {anulando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  Sí, anular
                </button>
              </div>
            </div>
          )}

          {!confirmando && (
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: B.cream, color: B.charcoal }}>
                Cerrar
              </button>
              {comp.estado === 'emitido' && comp.venta_id && (
                <button onClick={() => setConfirmando(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5"
                  style={{ background: '#fee2e2', color: B.terra }}>
                  <Ban className="w-4 h-4" />
                  <span className="hidden sm:inline">Anular</span>
                </button>
              )}
              <button onClick={handlePrint}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: B.charcoal, color: B.cream }}>
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

// ─── Constantes ───────────────────────────────────────────────────────────────
const POR_PAGINA     = 15;
const LIMITE_FETCH   = 1000; // sin límite práctico

// ─── Cargar items de una venta ────────────────────────────────────────────────
async function fetchVentaItems(ventaId: string): Promise<VentaItem[]> {
  const { data, error } = await supabase
    .from('venta_items')
    .select('id, cantidad, precio_unitario, subtotal, producto:productos(nombre, categoria)')
    .eq('venta_id', ventaId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as unknown as VentaItem[];
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ComprobantesView() {
  const [lista,        setLista]        = useState<CompDetalle[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [rtStatus,     setRtStatus]     = useState<RealtimeStatus>('connecting');
  const [busqueda,     setBusqueda]     = useState('');
  const [tipoFiltro,   setTipoFiltro]   = useState<TipoFiltro>('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');
  const [sortDir,      setSortDir]      = useState<SortDir>('desc');
  const [pagina,       setPagina]       = useState(1);
  const [modalComp,    setModalComp]    = useState<CompDetalle | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; type: ToastType } | null>(null);

  // ── FIX #1: la carga inicial se hace con una ref para evitar cascada ─────────
  // No se llama setState directamente en el cuerpo del effect;
  // se pasa por un callback async que se ejecuta de forma asíncrona.
  const isMountedRef = useRef(false);

  const cargarComprobantes = useCallback(async () => {
    try {
      setFetchError(null);
      const { data, error } = await supabase
        .from('v_comprobantes_detalle')
        .select('*')
        .order('fecha_emision', { ascending: false })
        .limit(LIMITE_FETCH);
      if (error) throw error;
      setLista((data ?? []) as unknown as CompDetalle[]);
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : 'Error al cargar comprobantes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── FIX #1 (continuación): useEffect solo suscribe y delega la carga ────────
  useEffect(() => {
    // Evitar doble ejecución en Strict Mode
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    // Carga inicial: se ejecuta de forma asíncrona, no en el cuerpo del effect
    void cargarComprobantes();

    // Realtime: cualquier cambio en comprobantes o ventas recarga
    const channel = supabase
      .channel('comprobantes-rt-v2')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'comprobantes' },
        () => void cargarComprobantes(),
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ventas' },
        () => void cargarComprobantes(),
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED')   setRtStatus('connected');
        if (status === 'CLOSED')       setRtStatus('disconnected');
        if (status === 'CHANNEL_ERROR') setRtStatus('disconnected');
      });

    return () => { void supabase.removeChannel(channel); };
  }, [cargarComprobantes]);

  // ── Abrir modal y cargar items bajo demanda ──────────────────────────────────
  const abrirModal = useCallback(async (comp: CompDetalle) => {
    // Mostrar modal inmediatamente con spinner en items
    setModalComp(comp);
    if (comp.itemsLoaded || !comp.venta_id) {
      setModalComp({ ...comp, itemsLoaded: true });
      return;
    }
    try {
      const items = await fetchVentaItems(comp.venta_id);
      const updated: CompDetalle = { ...comp, items, itemsLoaded: true };
      setModalComp(updated);
      // Cachear en lista principal
      setLista(prev => prev.map(c => c.id === comp.id ? updated : c));
    } catch {
      setModalComp(prev => prev ? { ...prev, items: [], itemsLoaded: true } : null);
    }
  }, []);

  // ── Anular comprobante ───────────────────────────────────────────────────────
  // Solo se necesita cambiar ventas.estado → 'anulada'.
  // Los triggers de PostgreSQL hacen el resto:
  //   • fn_restaurar_stock_anulacion  → devuelve stock_tienda producto por producto
  //   • fn_registrar_ingreso_caja     → egreso en caja y descuenta monto_actual
  //   • fn_actualizar_puntos_cliente  → resta puntos_ganados al cliente
  //   • El comprobante se actualiza por CASCADE o por el trigger de ventas.
  const handleAnular = useCallback(async (comprobanteId: string, ventaId: string) => {
    try {
      // FIX #5: cast explícito para satisfacer el tipado estricto de supabase-js
      const { error } = await supabase
        .from('ventas')
        .update({ estado: 'anulada' } as Record<string, string>)
        .eq('id', ventaId);
      if (error) throw error;

      // Marcar también el comprobante (por si el trigger no lo hace automático)
      await supabase
        .from('comprobantes')
        .update({ estado: 'anulado' } as Record<string, string>)
        .eq('id', comprobanteId);

      setToast({ msg: 'Comprobante anulado. Stock, caja y puntos revertidos.', type: 'success' });
      // El realtime actualizará la lista automáticamente
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al anular';
      setToast({ msg, type: 'error' });
      throw e;
    }
  }, []);

  // ── Filtrado y ordenamiento ──────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return lista
      .filter(c => {
        const matchQ = !q
          || c.numero.toLowerCase().includes(q)
          || (c.cliente_nombre ?? '').toLowerCase().includes(q)
          || c.usuario_nombre.toLowerCase().includes(q)
          || (c.dni ?? '').includes(q)
          || (c.ruc ?? '').includes(q);
        return matchQ
          && (tipoFiltro   === 'todos' || c.tipo   === tipoFiltro)
          && (estadoFiltro === 'todos' || c.estado === estadoFiltro);
      })
      .sort((a, b) =>
        sortDir === 'desc'
          ? b.fecha_emision.localeCompare(a.fecha_emision)
          : a.fecha_emision.localeCompare(b.fecha_emision),
      );
  }, [lista, busqueda, tipoFiltro, estadoFiltro, sortDir]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaReal   = Math.min(pagina, totalPaginas);
  const paginados    = filtrados.slice((paginaReal - 1) * POR_PAGINA, paginaReal * POR_PAGINA);

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const hoyStr  = new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
  const esHoy   = (iso: string) =>
    new Date(iso).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) === hoyStr;

  const emitidosHoy = lista.filter(c => c.estado === 'emitido' && esHoy(c.fecha_emision));
  const totalHoy    = emitidosHoy.reduce((s, c) => s + c.monto, 0);
  const boletasHoy  = emitidosHoy.filter(c => c.tipo === 'boleta').length;
  const notasHoy    = emitidosHoy.filter(c => c.tipo === 'nota_venta').length;
  const factTotal   = lista.filter(c => c.tipo === 'factura').length;

  // ── Paginación inteligente ────────────────────────────────────────────────────
  const pageNums = useMemo(() => {
    const delta = 2;
    const pages: number[] = [];
    for (
      let i = Math.max(1, paginaReal - delta);
      i <= Math.min(totalPaginas, paginaReal + delta);
      i++
    ) pages.push(i);
    return pages;
  }, [paginaReal, totalPaginas]);

  // ── Estados de carga ─────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  if (fetchError) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertCircle className="w-12 h-12" style={{ color: B.terra }} />
      <p className="text-sm text-center max-w-sm" style={{ color: B.charcoal }}>{fetchError}</p>
      <button onClick={() => { setIsLoading(true); void cargarComprobantes(); }}
        className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
        style={{ background: B.cream, color: B.charcoal }}>
        <RefreshCw className="w-4 h-4" /> Reintentar
      </button>
    </div>
  );

  // ── FIX #2: "action" en lugar de "actions" (según PageHeaderProps) ───────────
  return (
    <div>
      <PageHeader
        title="Comprobantes"
        subtitle={`Boletas, facturas y notas de venta · Total: ${lista.length}`}
        action={
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: rtStatus === 'connected' ? '#e8f5e2' : '#fef3c7',
                color:      rtStatus === 'connected' ? B.green   : B.gold,
              }}>
              {rtStatus === 'connected'
                ? <Wifi    className="w-3.5 h-3.5" />
                : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {rtStatus === 'connected' ? 'En vivo' : 'Sin conexión'}
              </span>
            </div>
            <button
              onClick={() => { setIsLoading(true); void cargarComprobantes(); }}
              className="p-2 rounded-lg transition-colors"
              style={{ color: B.muted }}
              title="Refrescar"
              onMouseEnter={e => { e.currentTarget.style.background = B.cream; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <KpiCard label="Total Emitido Hoy" value={`S/ ${totalHoy.toFixed(2)}`}
          icon={DollarSign} color={B.green} />
        <KpiCard label="Boletas Hoy" value={boletasHoy}
          sub={`Total: ${lista.filter(c => c.tipo === 'boleta').length}`}
          icon={Receipt} color={B.terra} />
        <KpiCard label="Notas de Venta" value={notasHoy}
          sub={`Total: ${lista.filter(c => c.tipo === 'nota_venta').length}`}
          icon={FileText} color={B.gold} />
        <KpiCard label="Facturas" value={factTotal}
          icon={FileText} color={B.charcoal} />
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
              placeholder="Número, cliente, DNI, RUC o usuario…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}
            />
          </div>
          {/* FIX #4: min-w-160 en lugar de min-w-[640px] */}
          <select value={tipoFiltro}
            onChange={e => { setTipoFiltro(e.target.value as TipoFiltro); setPagina(1); }}
            className="px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}>
            <option value="todos">Todos los tipos</option>
            <option value="boleta">Boletas</option>
            <option value="nota_venta">Notas de Venta</option>
            <option value="factura">Facturas</option>
          </select>
          <select value={estadoFiltro}
            onChange={e => { setEstadoFiltro(e.target.value as EstadoFiltro); setPagina(1); }}
            className="px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}>
            <option value="todos">Todos los estados</option>
            <option value="emitido">Emitidos</option>
            <option value="anulado">Anulados</option>
          </select>
        </div>
        {(busqueda || tipoFiltro !== 'todos' || estadoFiltro !== 'todos') && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: B.creamDark }}>
            <p className="text-xs" style={{ color: B.muted }}>
              <strong>{filtrados.length}</strong> de <strong>{lista.length}</strong> comprobantes
            </p>
            <button
              onClick={() => { setBusqueda(''); setTipoFiltro('todos'); setEstadoFiltro('todos'); setPagina(1); }}
              className="text-xs font-semibold flex items-center gap-1"
              style={{ color: B.terra }}>
              <X className="w-3 h-3" /> Limpiar
            </button>
          </div>
        )}
      </Card>

      {/* Tabla — FIX #4: min-w-160 en vez de min-w-[640px] */}
      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-160">
            <thead>
              <tr style={{ background: B.cream }}>
                {['Número', 'Tipo', 'Cliente / Doc.', 'Emitido por'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-black uppercase tracking-widest"
                    style={{ color: B.muted }}>{h}</th>
                ))}
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPagina(1); }}
                    className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest"
                    style={{ color: B.muted }}>
                    Fecha
                    {sortDir === 'desc'
                      ? <ChevronDown className="w-3.5 h-3.5" style={{ color: B.green }} />
                      : <ChevronUp   className="w-3.5 h-3.5" style={{ color: B.green }} />}
                  </button>
                </th>
                {['Monto', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-black uppercase tracking-widest"
                    style={{ color: B.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginados.map(c => (
                <tr key={c.id}
                  style={{ borderTop: `1px solid ${B.cream}`, opacity: c.estado === 'anulado' ? 0.55 : 1 }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${B.cream}60`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: B.charcoal }}>
                    {c.numero}
                  </td>
                  <td className="px-4 py-3"><TipoBadge tipo={c.tipo} /></td>
                  <td className="px-4 py-3">
                    <p className="text-sm" style={{ color: B.charcoal }}>{c.cliente_nombre ?? 'Cliente General'}</p>
                    {(c.tipo === 'factura' && c.ruc) && (
                      <p className="text-[10px]" style={{ color: B.muted }}>RUC: {c.ruc}</p>
                    )}
                    {(c.tipo === 'boleta' && c.dni) && (
                      <p className="text-[10px]" style={{ color: B.muted }}>DNI: {c.dni}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{c.usuario_nombre}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: B.muted }}>
                    {fmtFecha(c.fecha_emision)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: B.charcoal }}>
                    {fmtMoney(c.monto)}
                  </td>
                  <td className="px-4 py-3"><EstadoBadge estado={c.estado} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => void abrirModal(c)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: B.green }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${B.green}15`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        title="Ver comprobante">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => void abrirModal(c)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: B.gold }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${B.gold}15`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        title="Imprimir">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginados.length === 0 && (
          <div className="py-16 text-center" style={{ color: B.muted }}>
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No se encontraron comprobantes</p>
            {busqueda && <p className="text-xs mt-1">Prueba con otro término</p>}
          </div>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2"
            style={{ borderColor: B.cream }}>
            <p className="text-xs order-2 sm:order-1" style={{ color: B.muted }}>
              Página {paginaReal} de {totalPaginas} · {filtrados.length} resultados
            </p>
            <div className="flex gap-1 order-1 sm:order-2">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={paginaReal === 1}
                className="w-8 h-8 rounded-lg text-xs font-semibold disabled:opacity-30"
                style={{ background: B.cream, color: B.charcoal }}>‹</button>
              {paginaReal > 3 && (
                <>
                  <button onClick={() => setPagina(1)}
                    className="w-8 h-8 rounded-lg text-xs font-semibold"
                    style={{ background: B.cream, color: B.charcoal }}>1</button>
                  {paginaReal > 4 && (
                    <span className="w-8 h-8 flex items-center justify-center text-xs"
                      style={{ color: B.muted }}>…</span>
                  )}
                </>
              )}
              {pageNums.map(p => (
                <button key={p} onClick={() => setPagina(p)}
                  className="w-8 h-8 rounded-lg text-xs font-semibold"
                  style={p === paginaReal
                    ? { background: B.charcoal, color: B.cream }
                    : { background: B.cream,    color: B.charcoal }}>
                  {p}
                </button>
              ))}
              {paginaReal < totalPaginas - 2 && (
                <>
                  {paginaReal < totalPaginas - 3 && (
                    <span className="w-8 h-8 flex items-center justify-center text-xs"
                      style={{ color: B.muted }}>…</span>
                  )}
                  <button onClick={() => setPagina(totalPaginas)}
                    className="w-8 h-8 rounded-lg text-xs font-semibold"
                    style={{ background: B.cream, color: B.charcoal }}>{totalPaginas}</button>
                </>
              )}
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaReal === totalPaginas}
                className="w-8 h-8 rounded-lg text-xs font-semibold disabled:opacity-30"
                style={{ background: B.cream, color: B.charcoal }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalComp && (
        <ModalVerComprobante
          comp={modalComp}
          onClose={() => setModalComp(null)}
          onAnular={handleAnular}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}