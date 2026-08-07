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
// `targetAddressSpace: 'local'` ayuda a que Chrome identifique la petición
// como local desde el vamos (se ignora en navegadores que no lo soportan).
const LOCAL_FETCH_EXTRA: Record<string, unknown> = { targetAddressSpace: 'local' };

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
    return res.ok;
  } catch {
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

// ─── Helper de alto nivel: arma el ticket de un comprobante y lo imprime ──────
// Ajusta el layout a tu formato real de ticket térmico (80mm / 48 columnas).

import type { CompDetalle } from '@/constants/comprobantes/comprobantesConstants';
import { fmtMoney, fmtFecha, buildQrData } from '@/utils/comprobantes/comprobantesUtils';

export function construirTicketComprobante(comp: CompDetalle): TicketElement[] {
  const elements: TicketElement[] = [
    { type: 'text', value: 'MADRE · Postres y Café', align: 'center', bold: true, size: 'double' },
    { type: 'text', value: 'RUC 20000000000', align: 'center' },
    { type: 'line' },
    { type: 'text', value: comp.tipo.toUpperCase().replace('_', ' '), align: 'center', bold: true },
    { type: 'text', value: comp.numero, align: 'center' },
    { type: 'text', value: fmtFecha(comp.fecha_emision), align: 'center' },
    { type: 'line' }
  ];

  (comp.items || []).forEach((item) => {
    elements.push({
      type: 'text',
      value: `${item.cantidad} x ${item.producto?.nombre ?? 'Producto'}`
    });
    elements.push({ type: 'text', value: fmtMoney(item.subtotal), align: 'right' });
  });

  elements.push({ type: 'line' });
  elements.push({ type: 'text', value: `TOTAL: ${fmtMoney(comp.monto)}`, align: 'right', bold: true, size: 'double' });
  elements.push({ type: 'feed', lines: 1 });
  elements.push({ type: 'qr', value: buildQrData(comp), size: 5 });
  elements.push({ type: 'feed', lines: 2 });
  elements.push({ type: 'text', value: '¡Gracias por su compra!', align: 'center' });
  elements.push({ type: 'feed', lines: 3 });
  elements.push({ type: 'cut' });

  return elements;
}

/** Uso típico tras confirmar una venta: */
export async function imprimirComprobante(comp: CompDetalle) {
  const disponible = await agenteDisponible();
  if (!disponible) {
    throw new Error(
      'El agente de impresión no está instalado o no está corriendo en este equipo.'
    );
  }
  const elements = construirTicketComprobante(comp);
  return imprimirDocumento(elements);
}
