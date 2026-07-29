// utils/insumos/insumosUtils.ts

// ─── Tipos formulario insumo ───────────────────────────────────────────────────
export type UnidadKey = 'unidades' | 'porciones' | 'kg' | 'litros' | 'bolsas' | 'cajas';

export interface FormState {
  nombre: string; categoria: string; unidad_medida: UnidadKey;
  stock_tienda: string; stock_minimo_tienda: string;
  precio: string; costo: string;
}

// ─── Tipos historial ────────────────────────────────────────────────────────────
export interface HistorialItem {
  id: string;
  producto_id: string;
  producto_nombre: string;
  delta: number;           // negativo = consumo, positivo = ingreso
  stock_resultante: number;
  observacion: string | null;
  usuario_nombre: string | null;
  created_at: string;
}

export type PeriodoFiltro = 'hoy' | 'semana' | 'mes';
export type TipoFiltro    = 'todos' | 'consumo' | 'ingreso';

// ─── Fecha/hora en zona horaria de Lima ─────────────────────────────────────────
// BUG CONOCIDO EN LA BD (no corregido ahí a propósito, por pedido del usuario):
// la columna created_at de movimientos_almacen tiene DEFAULT
// (now() AT TIME ZONE 'America/Lima') sobre una columna timestamptz. Postgres
// reinterpreta ese valor "naive" (hora Lima sin tag de zona) usando la zona de
// la SESIÓN (UTC, confirmado con `SHOW timezone`), guardando el instante real
// MENOS 5 horas. O sea: todo lo que llega en created_at está atrasado 5h.
//
// Mientras eso no se corrija en la BD (cambiar el DEFAULT a `now()`), lo
// compensamos aquí sumando esas 5 horas antes de formatear. Ojo: si algún día
// se arregla el DEFAULT en la base de datos, esta compensación hay que
// quitarla o los registros nuevos saldrán 5h ADELANTADOS.
const BUG_OFFSET_MS = 5 * 60 * 60 * 1000;

function corregirFecha(iso: string): Date {
  return new Date(new Date(iso).getTime() + BUG_OFFSET_MS);
}

export function fmtLimaFecha(iso: string): string {
  return corregirFecha(iso).toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
}

export function fmtLimaHora(iso: string): string {
  return corregirFecha(iso).toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Rango de fecha inicio según período, en zona horaria de Lima ───────────────
// (evita el bug de convertir a UTC: Lima es UTC-5, así que pasadas las
// 19:00 hora Lima, .toISOString() ya devuelve la fecha del día siguiente)
export function calcFechaInicioLima(periodo: PeriodoFiltro): string {
  const fmtLima = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const hoyLimaStr = fmtLima.format(new Date()); // "YYYY-MM-DD" en hora Lima
  const [yLima, mLima, dLima] = hoyLimaStr.split('-').map(Number);
  const hoyLimaUTC = new Date(Date.UTC(yLima, mLima - 1, dLima)); // fecha "pura" para operar días

  if (periodo === 'hoy') return hoyLimaStr;

  if (periodo === 'semana') {
    const diaSemana = hoyLimaUTC.getUTCDay();
    const lunes = new Date(hoyLimaUTC);
    lunes.setUTCDate(hoyLimaUTC.getUTCDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
    return lunes.toISOString().split('T')[0];
  }

  return `${yLima}-${String(mLima).padStart(2, '0')}-01`;
}