// utils/comprobantesUtils.ts
import { supabase } from '@/lib/supabase/client';
import type { VentaItem, CompDetalle } from '@/constants/comprobantes/comprobantesConstants';
import { TIPO_CFG, METODO_LABEL } from '@/constants/comprobantes/comprobantesConstants';
import type { TipoComprobante } from '@/lib/supabase/types';

// ─── Datos del emisor (ajusta aquí si cambian) ────────────────────────────────
export const EMISOR_RUC = '20000000000';

// ─── Formatters ───────────────────────────────────────────────────────────────
export const fmtMoney = (n: number) => `S/ ${n.toFixed(2)}`;

export const fmtFecha = (iso: string): string => {
  // fecha_emision está guardada como hora Lima en UTC (sin offset real)
  // → NO aplicar conversión de zona, mostrar tal cual
  const d = new Date(iso);
  const dia  = String(d.getUTCDate()).padStart(2, '0');
  const mes  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const anio = d.getUTCFullYear();
  const hh   = String(d.getUTCHours()).padStart(2, '0');
  const mm   = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = Number(hh) >= 12 ? 'p. m.' : 'a. m.';
  const h12  = Number(hh) % 12 || 12;
  return `${dia}/${mes}/${anio}, ${h12}:${mm} ${ampm}`;
};

// Solo la fecha (dd/mm/yyyy), sin hora — usado para F. Emisión / F. Vencimiento
export const fmtFechaSolo = (iso: string): string => {
  const d = new Date(iso);
  const dia  = String(d.getUTCDate()).padStart(2, '0');
  const mes  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const anio = d.getUTCFullYear();
  return `${dia}/${mes}/${anio}`;
};

// Fecha en formato ISO corto (yyyy-mm-dd) — usado dentro del string del QR
export const fmtFechaISO = (iso: string): string => {
  const d = new Date(iso);
  const dia  = String(d.getUTCDate()).padStart(2, '0');
  const mes  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const anio = d.getUTCFullYear();
  return `${anio}-${mes}-${dia}`;
};

// Solo la hora (h:mm a. m./p. m.) — usado junto a F. Emisión
export const fmtHora = (iso: string): string => {
  const d = new Date(iso);
  const hh   = String(d.getUTCHours()).padStart(2, '0');
  const mm   = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = Number(hh) >= 12 ? 'p. m.' : 'a. m.';
  const h12  = Number(hh) % 12 || 12;
  return `${h12}:${mm} ${ampm}`;
};

// ─── Número a letras (para "Son: ... SOLES") ──────────────────────────────────
const UNIDADES  = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const ESPECIALES = [
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
  'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
];
const DECENAS   = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS  = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertirDecenas(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return ESPECIALES[n - 10];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 2 && u > 0) return `VEINTI${UNIDADES[u]}`;
  if (u === 0) return DECENAS[d];
  return `${DECENAS[d]} Y ${UNIDADES[u]}`;
}

function convertirCentenas(n: number): string {
  if (n === 100) return 'CIEN';
  const c      = Math.floor(n / 100);
  const resto  = n % 100;
  const prefijo = c > 0 ? CENTENAS[c] : '';
  const sufijo  = resto > 0 ? convertirDecenas(resto) : '';
  return [prefijo, sufijo].filter(Boolean).join(' ');
}

function convertirMiles(n: number): string {
  if (n < 1000) return convertirCentenas(n);
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const prefijoMiles = miles === 1 ? 'MIL' : `${convertirCentenas(miles)} MIL`;
  const sufijo = resto > 0 ? convertirCentenas(resto) : '';
  return [prefijoMiles, sufijo].filter(Boolean).join(' ');
}

/** Convierte un monto (ej. 2.5) en "SON: DOS CON 50/100 SOLES" */
export function numeroALetras(monto: number): string {
  const entero   = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  const letras   = entero === 0 ? 'CERO' : convertirMiles(entero);
  const centavosStr = String(centavos).padStart(2, '0');
  return `SON: ${letras} CON ${centavosStr}/100 SOLES`;
}

// ─── Código hash decorativo (estilo SUNAT) a partir del id del comprobante ────
export function generarCodigoHash(id: string): string {
  const clean = id.replace(/-/g, '').toUpperCase();
  const parts = [clean.slice(0, 8), clean.slice(8, 12), clean.slice(12, 16), clean.slice(16, 24)];
  return parts.filter(Boolean).join('-');
}

// ─── Serie / correlativo a partir del número (ej. "B001-00000004") ───────────
export function parseSerieCorrelativo(comp: CompDetalle): { serie: string; correlativo: string } {
  if (comp.serie && comp.correlativo != null) {
    return { serie: comp.serie, correlativo: String(comp.correlativo).padStart(8, '0') };
  }
  const [serie, correlativo] = (comp.numero ?? '').split('-');
  return { serie: serie ?? comp.numero, correlativo: (correlativo ?? '').padStart(8, '0') };
}

// ─── String de datos del QR, formato SUNAT ────────────────────────────────────
// RUC emisor | tipo doc (01=factura, 03=boleta) | serie | correlativo | IGV | total | fecha emisión | tipo moneda (1=soles) | doc. cliente
export function buildQrData(comp: CompDetalle): string {
  const tipoDoc   = comp.tipo === 'factura' ? '01' : '03';
  const { serie, correlativo } = parseSerieCorrelativo(comp);
  const igv       = (comp.igv ?? (comp.monto - comp.monto / 1.18)).toFixed(2);
  const total     = comp.monto.toFixed(2);
  const fecha     = fmtFechaISO(comp.fecha_emision);
  const docCliente = comp.tipo === 'factura' ? (comp.ruc ?? '-') : (comp.dni ?? '-');

  return [
    EMISOR_RUC,
    tipoDoc,
    serie,
    correlativo,
    igv,
    total,
    fecha,
    '1',
    docCliente,
  ].join('|');
}

// ─── URL de QR (servicio público, solo visual/decorativo) ────────────────────
export function buildQrUrl(data: string, size = 110): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

// ─── Fetch items de una venta ─────────────────────────────────────────────────
export async function fetchVentaItems(ventaId: string): Promise<VentaItem[]> {
  const { data, error } = await supabase
    .from('venta_items')
    .select('id, cantidad, precio_unitario, subtotal, producto:productos(nombre, categoria)')
    .eq('venta_id', ventaId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as unknown as VentaItem[];
}

// ─── Builder HTML de impresión (mismo formato que la vista previa) ────────────
export function buildPrintHTML(comp: CompDetalle): string {
  const cfg       = TIPO_CFG[comp.tipo as TipoComprobante];
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

  const itemsHtml = comp.items && comp.items.length > 0
    ? comp.items.map(i => `
        <tr>
          <td class="qty">${i.cantidad}</td>
          <td class="desc">${i.producto?.nombre ?? 'Producto'}</td>
          <td class="price">${fmtMoney(i.precio_unitario)}</td>
          <td class="price">${fmtMoney(i.subtotal)}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="text-align:center;padding:6px 0;color:#888;font-style:italic">Sin detalle registrado</td></tr>`;

  let totalesHtml = '';
  if (descuento > 0) {
    totalesHtml += `
      <tr><td>Subtotal bruto:</td><td class="right">${fmtMoney(subtotal + descuento)}</td></tr>
      <tr><td>Descuento:</td><td class="right">- ${fmtMoney(descuento)}</td></tr>`;
  }
  if (esNota) {
    totalesHtml += `<tr><td>Subtotal:</td><td class="right">${fmtMoney(subtotal)}</td></tr>`;
  } else if (comp.tipo === 'factura') {
    totalesHtml += `
      <tr><td>Op. Gravadas:</td><td class="right">${fmtMoney(baseImponible)}</td></tr>
      <tr><td>IGV (18%):</td><td class="right">${fmtMoney(igvCalculado)}</td></tr>`;
  } else {
    totalesHtml += `
      <tr><td>Op. Gravadas:</td><td class="right">${fmtMoney(subtotal)}</td></tr>
      <tr><td>IGV:</td><td class="right">${fmtMoney(igv)}</td></tr>`;
  }

  const footerLegal =
    comp.tipo === 'boleta'     ? 'Representación impresa de la BOLETA DE VENTA ELECTRÓNICA' :
    comp.tipo === 'factura'    ? 'Representación impresa de la FACTURA ELECTRÓNICA' :
                                 'Representación impresa de la NOTA DE VENTA';

  const clienteRows = [
    `<tr><td class="bold">Cliente:</td><td>${comp.cliente_nombre ?? 'Cliente General'}</td></tr>`,
    comp.tipo === 'factura' && comp.ruc ? `<tr><td class="bold">RUC:</td><td>${comp.ruc}</td></tr>` : '',
    comp.tipo === 'boleta'  && comp.dni ? `<tr><td class="bold">DNI:</td><td>${comp.dni}</td></tr>` : '',
  ].join('');

  const pagoLinea = `${fechaSolo} - ${METODO_LABEL[comp.metodo_pago] ?? comp.metodo_pago} - ${fmtMoney(recibido)}`;

  const bloqueNota = esNota ? `
    <div class="sep2"></div>
    <div class="bold center" style="font-size:15px;margin:5px 0">TOTAL A PAGAR: ${fmtMoney(total)}</div>
    <div class="sep"></div>
    <div style="font-size:11px"><b>PAGOS:</b></div>
    <div style="font-size:11px">- ${pagoLinea}</div>
    <div class="center bold" style="font-size:12px;margin-top:4px">SALDO: ${fmtMoney(saldo)}</div>
  ` : `
    <table class="subtbl"><tbody>
      ${totalesHtml}
      <tr class="total-row"><td>TOTAL A PAGAR:</td><td class="right">${fmtMoney(total)}</td></tr>
    </tbody></table>
    <div style="font-size:10px;margin-top:4px">${numeroALetras(total)}</div>
    <div class="sep"></div>
    <div class="qr-block">
      <img src="${buildQrUrl(buildQrData(comp))}" alt="QR" style="width:88px;height:88px" onerror="this.style.display='none'"/>
      <div style="font-size:9px;text-align:left;flex:1">
        <div><b>CÓDIGO HASH:</b><br/>${generarCodigoHash(comp.id)}</div>
        <div style="margin-top:3px"><b>CONDICIÓN DE PAGO:</b> Contado</div>
        <div><b>PAGOS:</b> ${METODO_LABEL[comp.metodo_pago] ?? comp.metodo_pago} - ${fmtMoney(recibido)}</div>
        <div><b>VENDEDOR:</b> ${comp.usuario_nombre}</div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"/>
<title>${comp.numero}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.35;color:#000;background:#fff;width:80mm;padding:9px}
  .center{text-align:center} .right{text-align:right} .bold{font-weight:bold}
  .logo{width:130px;height:auto;display:block;margin:0 auto 4px;filter:grayscale(100%) contrast(200%) brightness(0)}
  .titulo{font-size:14px;font-weight:bold;letter-spacing:1px;margin:4px 0 2px;text-decoration:underline}
  .numero{font-size:13px;font-weight:bold;margin:3px 0}
  .anulado{font-size:15px;font-weight:bold;color:#cc0000;margin-top:4px}
  .sep{border-top:1px dashed #000;margin:7px 0} .sep2{border-top:2px solid #000;margin:7px 0}
  table{width:100%;border-collapse:collapse}
  th,td{font-size:11px;padding:2px 2px;vertical-align:top}
  th{font-weight:bold;border-bottom:1px solid #000}
  .qty{width:26px;text-align:center} .price{width:58px;text-align:right} .desc{text-align:left}
  .subtbl td{font-size:11px;padding:2px 2px}
  .total-row td{font-weight:bold;font-size:13px;border-top:1px solid #000;padding-top:4px}
  .qr-block{display:flex;gap:9px;align-items:flex-start;margin-top:5px}
  .footer{font-size:10px;text-align:center;margin-top:9px;color:#333}
  @media print{body{width:80mm}@page{margin:0;size:80mm auto}}
</style>
</head>
<body>
  <div class="center">
    <img class="logo" src="/icons/icono.png" alt="MADRE - Postres y Café" onerror="this.style.display='none'"/>
  </div>
  <div class="sep2"></div>
  <div class="center">
    <div class="titulo">${cfg.headerLabel}</div>
    <div class="numero">${comp.numero}</div>
    ${comp.estado === 'anulado' ? '<div class="anulado">*** ANULADO ***</div>' : ''}
  </div>
  <div class="sep"></div>
  <table>
    <tr><td class="bold" style="width:95px">F. Emisión:</td><td>${fechaSolo}</td><td class="bold" style="width:42px">Hora:</td><td>${horaSolo}</td></tr>
    <tr><td class="bold">F. Vencimiento:</td><td colspan="3">${fechaSolo}</td></tr>
    ${clienteRows}
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
  ${bloqueNota}
  ${comp.notas ? `<div class="sep"></div><div style="font-size:10px"><b>Nota:</b> ${comp.notas}</div>` : ''}
  <div class="sep2"></div>
  <div class="footer">${footerLegal}<br/><b>¡GRACIAS POR SU COMPRA!</b><br/>www.madrepostres.pe</div>
</body></html>`;
}
// la venta, así que puede tardar un instante en aparecer en la vista. Por eso
// reintentamos unas veces con una pequeña espera antes de rendirnos.
export async function fetchComprobantePorVenta(
  ventaId: string,
  intentos = 6,
  esperaMs = 350,
): Promise<CompDetalle | null> {
  for (let i = 0; i < intentos; i++) {
    const { data, error } = await supabase
      .from('v_comprobantes_detalle')
      .select('*')
      .eq('venta_id', ventaId)
      .maybeSingle();
 
    if (error) throw error;
    if (data) return data as unknown as CompDetalle;
 
    await new Promise(resolve => setTimeout(resolve, esperaMs));
  }
  return null;
}
 
// ─── Imprime automáticamente el comprobante de una venta recién creada ────────
// Busca el comprobante + sus items y abre la ventana de impresión, usando el
// mismo formato (buildPrintHTML) que la vista de Comprobantes.
export async function imprimirComprobanteDeVenta(ventaId: string): Promise<boolean> {
  const comp = await fetchComprobantePorVenta(ventaId);
  if (!comp) return false;
 
  const items = await fetchVentaItems(ventaId).catch(() => []);
  const compConItems: CompDetalle = { ...comp, items, itemsLoaded: true };
 
  const w = window.open('', '_blank', 'width=440,height=720');
  if (!w) return false;
  w.document.write(buildPrintHTML(compConItems));
  w.document.close();
  setTimeout(() => w.print(), 350);
  return true;
}