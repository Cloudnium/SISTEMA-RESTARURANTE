// utils/cajasUtils.ts
import type { Caja, MovimientoCaja } from '@/lib/supabase/types';
import { METODOS_PAGO_LABELS, ORDEN_METODOS_PAGO } from '@/constants/cajas/cajasConstants';

/** Movimiento de caja, con metodo_pago opcional (presente en ingresos generados por venta) */
export type MovimientoCajaExt = MovimientoCaja & { metodo_pago?: string | null };

/** Formatea un número como soles peruanos: "S/ 1,234.56" */
export function fmtSoles(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}

/** Formatea una fecha ISO a "dd/mm hh:mm" en zona Lima */
export function fmtFechaLima(iso: string): string {
  const d   = new Date(iso);
  const dia  = String(d.getUTCDate()).padStart(2, '0');
  const mes  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const anio = d.getUTCFullYear();
  const hh   = String(d.getUTCHours()).padStart(2, '0');
  const mm   = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = Number(hh) >= 12 ? 'p. m.' : 'a. m.';
  const h12  = Number(hh) % 12 || 12;
  return `${dia}/${mes}/${anio}, ${h12}:${mm} ${ampm}`;
}

/** Solo la fecha (dd/mm/yyyy), sin hora */
export function fmtFechaSoloLima(iso: string): string {
  const d   = new Date(iso);
  const dia  = String(d.getUTCDate()).padStart(2, '0');
  const mes  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const anio = d.getUTCFullYear();
  return `${dia}/${mes}/${anio}`;
}

/** Fecha ISO corta (yyyy-mm-dd) en hora Lima — usado para comparar/filtrar por día */
export function fechaISOLima(iso: string): string {
  const d   = new Date(iso);
  const dia  = String(d.getUTCDate()).padStart(2, '0');
  const mes  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const anio = d.getUTCFullYear();
  return `${anio}-${mes}-${dia}`;
}

/** Fecha de hoy en formato yyyy-mm-dd, zona Lima */
export function hoyISOLima(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

/**
 * Devuelve la hora ACTUAL (de verdad, en vivo) representada como un ISO string
 * "estilo Lima-guardada-como-UTC" — el mismo formato en que se guardan los
 * timestamps en la BD. Así, al pasarla por fmtFechaLima/fmtFechaLargaLima
 * (que leen con getUTC*), se muestra la hora Lima correcta sin desfase.
 * Úsala SIEMPRE en vez de `new Date().toISOString()` para mostrar "ahora".
 */
export function ahoraLimaComoUTC(): string {
  const ahora = new Date();
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(ahora);
  const get = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.000Z`;
}

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Fecha larga en español: "18 de junio de 2026" */
export function fmtFechaLargaLima(iso: string): string {
  const d   = new Date(iso);
  const dia  = d.getUTCDate();
  const mes  = MESES_ES[d.getUTCMonth()];
  const anio = d.getUTCFullYear();
  return `${dia} de ${mes} de ${anio}`;
}

/** Fecha larga en español a partir de un string yyyy-mm-dd (sin conversión de zona, evita descuadres) */
export function fmtFechaLargaDesdeYMD(fechaYMD: string): string {
  const [anio, mes, dia] = fechaYMD.split('-').map(Number);
  return `${dia} de ${MESES_ES[(mes ?? 1) - 1]} de ${anio}`;
}

/** Filtra movimientos cuyo created_at (hora Lima) caiga en el día dado (yyyy-mm-dd) */
export function filtrarMovimientosPorDia(
  movimientos: MovimientoCajaExt[],
  fechaISO: string,
): MovimientoCajaExt[] {
  return movimientos.filter(m => fechaISOLima(m.created_at) === fechaISO);
}

/** Suma el monto_actual de todas las cajas */
export function calcularTotalEnCajas(cajas: Caja[]): number {
  return cajas.reduce((acc, c) => acc + c.monto_actual, 0);
}

/** Cuenta cajas por estado */
export function contarCajasPorEstado(cajas: Caja[]) {
  return {
    abiertas: cajas.filter(c => c.estado === 'abierta').length,
    cerradas:  cajas.filter(c => c.estado === 'cerrada').length,
  };
}

/** Filtra cajas cuya fecha de apertura (o cierre, si no tiene apertura) caiga en el día dado (yyyy-mm-dd, Lima) */
export function filtrarCajasPorDia(cajas: Caja[], fechaISO: string): Caja[] {
  return cajas.filter(c => {
    const ref = c.fecha_apertura ?? c.fecha_cierre;
    if (!ref) return false;
    return fechaISOLima(ref) === fechaISO;
  });
}

/** Suma los montos de movimientos de tipo "ingreso" agrupados por método de pago */
export function calcularResumenMetodosPago(movimientos: MovimientoCajaExt[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  for (const m of ORDEN_METODOS_PAGO) mapa[m] = 0;

  movimientos
    .filter(m => m.tipo === 'ingreso')
    .forEach(m => {
      const metodo = m.metodo_pago ?? 'efectivo';
      mapa[metodo] = (mapa[metodo] ?? 0) + (m.monto ?? 0);
    });

  return mapa;
}

// ─── Builder HTML de impresión del Reporte de Caja (ticket 80mm) ─────────────
export function buildReportePrintHTML(caja: Caja, movimientos: MovimientoCajaExt[]): string {
  const ingresos      = movimientos.filter(m => m.tipo === 'ingreso');
  const egresos       = movimientos.filter(m => m.tipo === 'egreso');
  const totalIngresos = ingresos.reduce((s, m) => s + (m.monto ?? 0), 0);
  const totalEgresos  = egresos.reduce((s, m) => s + (m.monto ?? 0), 0);
  const metodos       = calcularResumenMetodosPago(movimientos);
  const fechaTexto    = fmtFechaLargaLima(ahoraLimaComoUTC());
  const estadoLabel   = caja.estado === 'abierta' ? 'ABIERTA' : 'CERRADA';
  const usuarioNombre = caja.usuario?.nombre ?? 'Sin asignar';

  const metodosHtml = ORDEN_METODOS_PAGO
    .map(m => `<tr><td>${METODOS_PAGO_LABELS[m].toUpperCase()}</td><td class="right">${fmtSoles(metodos[m] ?? 0)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"/>
<title>Reporte ${caja.nombre}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.4;color:#000;background:#fff;width:80mm;padding:9px}
  .center{text-align:center} .right{text-align:right} .bold{font-weight:bold}
  .logo{width:120px;height:auto;display:block;margin:0 auto 4px;filter:grayscale(100%) contrast(200%) brightness(0)}
  .titulo{font-size:14px;font-weight:bold;letter-spacing:1px;margin:4px 0 2px;text-decoration:underline}
  .badge{display:inline-block;border:1px solid #000;padding:2px 12px;font-weight:bold;font-size:11px;margin:4px 0}
  .sep{border-top:1px dashed #000;margin:7px 0} .sep2{border-top:2px solid #000;margin:7px 0}
  table{width:100%;border-collapse:collapse}
  td{font-size:11px;padding:2px 2px}
  .total-row td{font-weight:bold;font-size:13px;border-top:1px solid #000;padding-top:4px}
  .footer{font-size:10px;text-align:center;margin-top:9px;color:#333}
  @media print{body{width:80mm}@page{margin:0;size:80mm auto}}
</style>
</head>
<body>
  <div class="center">
    <img class="logo" src="/icons/icono.png" alt="MADRE" onerror="this.style.display='none'"/>
  </div>
  <div class="sep2"></div>
  <div class="center">
    <div class="titulo">REPORTE DE CAJA</div>
    <div class="badge">${estadoLabel}</div>
    <div style="font-size:11px;margin-top:2px">${fechaTexto}</div>
  </div>
  <div class="sep"></div>
  <table>
    <tr><td class="bold" style="width:90px">CAJA:</td><td class="right bold">${caja.nombre.toUpperCase()}</td></tr>
    <tr><td class="bold">USUARIO:</td><td class="right">${usuarioNombre.toUpperCase()}</td></tr>
    <tr><td class="bold">VENTAS:</td><td class="right">${ingresos.length}</td></tr>
  </table>
  <div class="sep"></div>
  <table>
    <tr><td class="bold">SALDO INICIAL</td><td class="right">${fmtSoles(caja.monto_inicial)}</td></tr>
    <tr><td class="bold">INGRESOS</td><td class="right">${fmtSoles(totalIngresos)}</td></tr>
    <tr><td class="bold">EGRESOS</td><td class="right">-${fmtSoles(totalEgresos)}</td></tr>
  </table>
  <div class="sep"></div>
  <div class="bold" style="font-size:11px">MÉTODOS DE PAGO</div>
  <table style="margin-top:3px">${metodosHtml}</table>
  <div class="sep2"></div>
  <table>
    <tr class="total-row"><td>TOTAL INGRESOS</td><td class="right">${fmtSoles(totalIngresos)}</td></tr>
  </table>
  <div class="footer">Reporte generado automáticamente<br/>MADRE · Postres y Café</div>
</body></html>`;
}