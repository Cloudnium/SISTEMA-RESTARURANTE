// utils/print-agent/printAgentClient.ts
//
// Cliente para hablar con el Agente de Impresión local (proceso en segundo
// plano instalado una vez en el PC de caja). El agente expone una API en
// http://127.0.0.1:<puerto> — nunca sale a internet, así que esto solo
// funciona ejecutándose en el navegador del propio local (no en el servidor
// de Next.js / SSR).
//
// El token y el puerto se guardan en localStorage por estación de trabajo,
// ya que cada caja puede tener su propio agente/impresora.

const STORAGE_KEY_TOKEN = 'printAgent.token';
const STORAGE_KEY_PORT = 'printAgent.port';
const DEFAULT_PORT = 4321;

export type TicketElement =
  | { type: 'text'; value: string; align?: 'left' | 'center' | 'right'; bold?: boolean; size?: 'normal' | 'double' | 'quad' }
  | { type: 'line' }
  | { type: 'feed'; lines?: number }
  | { type: 'qr'; value: string; size?: number }
  | { type: 'barcode'; value: string; codeType?: string; width?: number; height?: number }
  | { type: 'image'; base64: string }
  | { type: 'cut' }
  | { type: 'cashdraw' };

export interface PrintTarget {
  interface: 'usb' | 'network';
  name?: string; // para 'usb'
  ip?: string; // para 'network'
  port?: number; // para 'network'
  width?: number;
  type?: 'epson' | 'star';
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

function getPort(): number {
  if (typeof window === 'undefined') return DEFAULT_PORT;
  const stored = localStorage.getItem(STORAGE_KEY_PORT);
  return stored ? Number(stored) : DEFAULT_PORT;
}

export function configurarAgente(token: string, port: number = DEFAULT_PORT) {
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_PORT, String(port));
}

export function getTokenGuardado(): string | null {
  return getToken();
}

export function getPortGuardado(): number {
  return getPort();
}

function baseUrl() {
  return `http://127.0.0.1:${getPort()}`;
}

// ── Nota sobre HTTPS/Vercel + Chrome "Local Network Access" ────────────────
// Como tu sistema se sirve por HTTPS (Vercel) y el agente escucha en
// http://127.0.0.1, Chrome/Edge recientes muestran UNA VEZ por sitio un
// permiso de navegador "quiere acceder a dispositivos en tu red local" antes
// de dejar pasar el fetch (esto es Local/Private Network Access, no un bug).
// - 127.0.0.1 y localhost NO cuentan como "mixed content" (eso ya no bloquea).
// - Lo que sí puede bloquear es ese permiso de red local si el usuario lo
//   rechaza. Por eso el emparejamiento (pantalla de Configuración > Impresión)
//   debe hacerse con calma la primera vez, aceptando el permiso del navegador,
//   y no confiar en que el primer intento silencioso (justo tras confirmar una
//   venta) vaya a funcionar sin que el usuario haya aceptado el permiso antes.
//
// IMPORTANTE: `targetAddressSpace` DEBE coincidir con la dirección real del
// agente. Como el agente escucha en 127.0.0.1 (loopback de la misma PC), el
// valor correcto es `'loopback'`. Si pones `'local'`, Chrome 142+ rechaza la
// petición con: "Request had a target IP address space of `local` yet the
// resource is in address space `loopback`". Se ignora en navegadores que no
// soportan esta opción.
const LOCAL_FETCH_EXTRA: Record<string, unknown> = { targetAddressSpace: 'loopback' };

async function agentFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    ...(LOCAL_FETCH_EXTRA as RequestInit),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-agent-token': token } : {}),
      ...(init.headers || {})
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error del agente de impresión (HTTP ${res.status})`);
  }
  return res.json();
}

/** Verifica si el agente está instalado y corriendo en este PC. */
export async function agenteDisponible(): Promise<boolean> {
  try {
    // Timeout generoso: si el navegador está mostrando el permiso de "red
    // local" por primera vez, la respuesta no llega hasta que el usuario
    // decide. Un timeout muy corto haría ver el agente como "no instalado"
    // aunque sí lo esté, solo porque el usuario tardó en hacer clic.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${baseUrl()}/health`, {
      signal: controller.signal,
      ...(LOCAL_FETCH_EXTRA as RequestInit)
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[print-agent] /health respondió HTTP ${res.status} — se trata como no disponible.`);
    }
    return res.ok;
  } catch (err) {
    // IMPORTANTE: antes esto fallaba en silencio (devolvía false sin decir
    // por qué), así que un bloqueo del navegador (permiso de "red local"
    // denegado/no concedido, Brave Shields, timeout real, agente apagado,
    // etc.) se veía IDÉNTICO desde afuera y era imposible diagnosticar cuál
    // era. Ahora queda el motivo real en la consola (F12 → Console) — si
    // vuelve a caer al diálogo del navegador, ese mensaje dice por qué.
    const motivo = err instanceof DOMException && err.name === 'AbortError'
      ? 'tiempo de espera agotado (4s) — el agente no respondió a tiempo'
      : err instanceof Error ? err.message : String(err);
    console.warn(
      `[print-agent] Agente no disponible: ${motivo}. ` +
      'Si el agente SÍ está corriendo en este equipo, revisa: ' +
      '1) que este sitio tenga permiso de "acceso a la red local" en la configuración del navegador/Brave Shields, ' +
      '2) que no haya otro proceso usando el puerto del agente.'
    );
    return false;
  }
}

export async function listarImpresoras() {
  return agentFetch('/printers');
}

export async function setImpresoraPredeterminada(target: PrintTarget) {
  return agentFetch('/printers/default', {
    method: 'POST',
    body: JSON.stringify({ target })
  });
}

export async function imprimirTicketPrueba() {
  return agentFetch('/print/test', { method: 'POST' });
}

/** Imprime un documento genérico ya armado como lista de elementos ESC/POS. */
export async function imprimirDocumento(elements: TicketElement[], target?: PrintTarget) {
  return agentFetch('/print', {
    method: 'POST',
    body: JSON.stringify({ target, elements })
  });
}

import type { CompDetalle } from '@/constants/comprobantes/comprobantesConstants';
import { TIPO_CFG, METODO_LABEL } from '@/constants/comprobantes/comprobantesConstants';
import {
  fmtMoney, fmtFechaSolo, fmtHora, numeroALetras,
  generarCodigoHash, buildQrData, EMISOR_RUC,
} from '@/utils/comprobantes/comprobantesUtils';

// ─── Helpers de layout del ticket térmico (80mm / 48 columnas) ────────────────
function padEnd(s: string, n: number): string {
  return (s + ' '.repeat(Math.max(0, n))).slice(0, n);
}
function padStart(s: string, n: number): string {
  return (' '.repeat(Math.max(0, n)) + s).slice(-Math.max(0, n));
}

/** Divide un texto en pedazos de a lo más `maxLen` caracteres (nombres largos). */
function dividirTexto(texto: string, maxLen: number): string[] {
  const limpio = texto.trim() || 'Producto';
  const pedazos: string[] = [];
  for (let i = 0; i < limpio.length; i += maxLen) {
    pedazos.push(limpio.slice(i, i + maxLen));
  }
  return pedazos;
}

/** Cabecera de la tabla de items (Cant | Descripción | P.Unit | Total). */
function cabeceraItems(): string {
  return padEnd('CANT', 6) + padEnd('DESCRIPCIÓN', 22) + padStart('P.UNIT', 10) + padStart('TOTAL', 10);
}

/** Fila(s) de un item: si el nombre es muy largo, continúa en la línea siguiente. */
function lineasItem(cantidad: number, nombre: string, punit: string, total: string): string[] {
  const ANCHO_DESC = 22;
  const pedazos = dividirTexto(nombre, ANCHO_DESC);
  return pedazos.map((pedazo, i) => {
    const esUltimo = i === pedazos.length - 1;
    const cant = padStart(String(cantidad), 4) + '  ';
    const desc = padEnd(pedazo, ANCHO_DESC);
    const precio = esUltimo ? punit : '';
    const subtotal = esUltimo ? total : '';
    if (i === 0) return cant + desc + padStart(precio, 10) + padStart(subtotal, 10);
    return padEnd('', 6) + desc + padStart(precio, 10) + padStart(subtotal, 10);
  });
}

/** Carga el logo (public/icons/icono.png) como base64 para imprimirlo como imagen. */
async function cargarLogoTicket(): Promise<string | null> {
  try {
    const res = await fetch('/icons/icono.png');
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = typeof reader.result === 'string' ? reader.result : null;
        resolve(result?.includes(',') ? result.split(',')[1] : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    return dataUrl;
  } catch {
    return null;
  }
}

// ─── (Legacy) Arma el ticket reconstruyéndolo con comandos de texto ESC/POS ──
// NOTA: esto YA NO es lo que usa `imprimirComprobante()` — se dejó como
// referencia/respaldo por si algún día se necesita un modo texto-plano (más
// liviano, sin bitmap) para una impresora muy lenta o de muy baja
// resolución. El camino normal ahora es `ticketRaster.ts`
// (renderComprobanteAImagen), que renderiza el HTML real y lo manda como
// imagen — así el ticket impreso queda igual al diseño, no una
// aproximación con texto.
export async function construirTicketComprobante(comp: CompDetalle): Promise<TicketElement[]> {
  const logo = await cargarLogoTicket();

  const cfg = TIPO_CFG[comp.tipo];
  const total = comp.monto;
  const subtotal = comp.subtotal ?? total;
  const igv = comp.igv ?? 0;
  const descuento = comp.descuento_monto ?? 0;
  const esNota = comp.tipo === 'nota_venta';
  const recibido = comp.monto_recibido ?? total;
  const saldo = Math.max(0, total - recibido);
  const baseImponible = total / 1.18;
  const igvCalculado = total - baseImponible;
  const fechaSolo = fmtFechaSolo(comp.fecha_emision);
  const horaSolo = fmtHora(comp.fecha_emision);
  const metodoLabel = METODO_LABEL[comp.metodo_pago] ?? comp.metodo_pago;

  // RUC solo en factura, DNI solo en boleta — en Nota de Venta no se muestra
  // ningún documento del cliente (así es el diseño real, ver clienteRows en
  // buildPrintHTML / ModalVerComprobante.tsx).
  const docCliente = comp.tipo === 'factura' ? comp.ruc : comp.tipo === 'boleta' ? comp.dni : null;
  const labelDoc = comp.tipo === 'factura' ? 'RUC' : 'DNI';

  const elements: TicketElement[] = [];

  // ── Encabezado (logo + marca + RUC) ─────────────────────────────────────
  if (logo) {
    elements.push({ type: 'image', base64: logo });
  } else {
    elements.push({ type: 'text', value: 'MADRE · POSTRES Y CAFÉ', align: 'center', bold: true, size: 'double' });
  }
  elements.push({ type: 'text', value: `RUC ${EMISOR_RUC}`, align: 'center' });
  elements.push({ type: 'line' });

  elements.push({ type: 'text', value: cfg.headerLabel, align: 'center', bold: true });
  elements.push({ type: 'text', value: comp.numero, align: 'center', bold: true });
  if (comp.estado === 'anulado') {
    elements.push({ type: 'text', value: '*** ANULADO ***', align: 'center', bold: true });
  }
  elements.push({ type: 'line' });

  // ── Datos del cliente / fechas ──────────────────────────────────────────
  elements.push({ type: 'text', value: `F. Emisión: ${fechaSolo}   Hora: ${horaSolo}` });
  elements.push({ type: 'text', value: `Cliente: ${comp.cliente_nombre ?? 'Cliente General'}` });
  if (docCliente) elements.push({ type: 'text', value: `${labelDoc}: ${docCliente}` });
  // "Cajero:" se muestra SIEMPRE (los 3 tipos de comprobante), no solo en
  // boleta/factura — antes faltaba en la Nota de Venta.
  elements.push({ type: 'text', value: `Cajero: ${comp.usuario_nombre}` });
  elements.push({ type: 'line' });

  // ── Tabla de items ──────────────────────────────────────────────────────
  elements.push({ type: 'text', value: cabeceraItems(), bold: true });
  if (comp.items && comp.items.length > 0) {
    comp.items.forEach((item) => {
      lineasItem(
        item.cantidad,
        item.producto?.nombre ?? 'Producto',
        fmtMoney(item.precio_unitario),
        fmtMoney(item.subtotal),
      ).forEach((linea) => {
        elements.push({ type: 'text', value: linea });
      });
    });
  } else {
    elements.push({ type: 'text', value: 'Sin detalle registrado', align: 'center' });
  }

  elements.push({ type: 'line' });

  // ── Totales / cierre — mismo branching que el bloque `bloqueNota` de ────
  //    buildPrintHTML(): la Nota de Venta usa un diseño distinto (con SALDO)
  //    y NO muestra el monto en letras ni el desglose de IGV. ────────────
  const lineaTotal = (label: string, valor: string) => {
    elements.push({ type: 'text', value: `${label} ${valor}`, align: 'right' });
  };

  if (esNota) {
    // El diseño real NO muestra ninguna línea de subtotal en la Nota de
    // Venta salvo que haya descuento (ver el bloque "Totales — Nota de
    // Venta" en ModalVerComprobante.tsx). Antes se agregaba un "Subtotal:"
    // siempre, incluso sin descuento, y encima con un valor mal calculado
    // (comp.subtotal traía la base imponible con IGV extraído, que no
    // aplica a una Nota de Venta).
    if (descuento > 0) {
      lineaTotal('Subtotal bruto:', fmtMoney(subtotal + descuento));
      lineaTotal('Descuento:', `- ${fmtMoney(descuento)}`);
    }
    elements.push({ type: 'line' });
    elements.push({ type: 'text', value: `TOTAL A PAGAR: ${fmtMoney(total)}`, align: 'center', bold: true, size: 'double' });
    elements.push({ type: 'line' });
    elements.push({ type: 'text', value: 'PAGOS:', bold: true });
    elements.push({ type: 'text', value: `- ${fechaSolo} - ${metodoLabel} - ${fmtMoney(recibido)}` });
    elements.push({ type: 'text', value: `SALDO: ${fmtMoney(saldo)}`, align: 'center', bold: true });
  } else {
    if (descuento > 0) {
      lineaTotal('Subtotal bruto:', fmtMoney(subtotal + descuento));
      lineaTotal('Descuento:', `- ${fmtMoney(descuento)}`);
    }
    if (comp.tipo === 'factura') {
      lineaTotal('Op. Gravadas:', fmtMoney(baseImponible));
      lineaTotal('IGV (18%):', fmtMoney(igvCalculado));
    } else {
      lineaTotal('Op. Gravadas:', fmtMoney(subtotal));
      lineaTotal('IGV:', fmtMoney(igv));
    }
    elements.push({ type: 'line' });
    elements.push({ type: 'text', value: `TOTAL A PAGAR: ${fmtMoney(total)}`, align: 'center', bold: true, size: 'double' });
    elements.push({ type: 'text', value: numeroALetras(total), align: 'center' });
    elements.push({ type: 'line' });

    // ── QR + hash / condición de pago / vendedor (igual que el qr-block) ──
    elements.push({ type: 'qr', value: buildQrData(comp), size: 5 });
    elements.push({ type: 'text', value: `CÓDIGO HASH: ${generarCodigoHash(comp.id)}`, align: 'center' });
    elements.push({ type: 'text', value: 'CONDICIÓN DE PAGO: Contado', align: 'center' });
    elements.push({ type: 'text', value: `PAGOS: ${metodoLabel} - ${fmtMoney(recibido)}`, align: 'center' });
    elements.push({ type: 'text', value: `VENDEDOR: ${comp.usuario_nombre}`, align: 'center' });
  }

  if (comp.notas) {
    elements.push({ type: 'line' });
    elements.push({ type: 'text', value: `NOTA: ${comp.notas}` });
  }

  // ── Pie ─────────────────────────────────────────────────────────────────
  elements.push({ type: 'line' });
  const footerLegal =
    comp.tipo === 'boleta'     ? 'Representación impresa de la BOLETA DE VENTA ELECTRÓNICA' :
    comp.tipo === 'factura'    ? 'Representación impresa de la FACTURA ELECTRÓNICA' :
                                 'Representación impresa de la NOTA DE VENTA';
  elements.push({ type: 'text', value: footerLegal, align: 'center' });
  elements.push({ type: 'text', value: '¡GRACIAS POR SU COMPRA!', align: 'center', bold: true });
  elements.push({ type: 'text', value: 'www.madrepostres.pe', align: 'center' });
  elements.push({ type: 'feed', lines: 3 });
  elements.push({ type: 'cut' });

  return elements;
}

/**
 * Uso típico tras confirmar una venta.
 *
 * Renderiza el comprobante EXACTAMENTE como se ve en Comprobantes (mismo
 * HTML de buildPrintHTML, convertido a imagen con ticketRaster.ts) y lo
 * manda como bitmap — así el ticket impreso queda igual al diseño real, no
 * una recreación aproximada con texto. Ver comentario en ticketRaster.ts.
 */
export async function imprimirComprobante(comp: CompDetalle) {
  const disponible = await agenteDisponible();
  if (!disponible) {
    throw new Error(
      'El agente de impresión no está instalado o no está corriendo en este equipo.'
    );
  }
  const { renderComprobanteAImagen } = await import('./ticketRaster');
  const base64 = await renderComprobanteAImagen(comp);
  const elements: TicketElement[] = [
    { type: 'image', base64 },
    { type: 'feed', lines: 3 },
    { type: 'cut' },
  ];
  return imprimirDocumento(elements);
}
