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
// Los timestamps vienen en UTC desde Supabase. Forzamos timeZone: 'America/Lima'
// explícitamente para que la hora mostrada sea siempre la de Perú, sin importar
// en qué zona horaria esté corriendo el navegador o el servidor.
export function fmtLimaFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
}

export function fmtLimaHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', {
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