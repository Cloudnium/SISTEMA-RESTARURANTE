// utils/reportes/reportesUtils.ts
// ─── Helpers internos de fecha (cálculo puro en UTC, sin depender del huso del entorno) ──
/** Devuelve {year, month, day} de "hoy" en hora de Lima, sin pasar por toLocaleString/toISOString */
function fechaLimaActual(): { year: number; month: number; day: number } {
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

/** Crea un Date "ancla" en UTC a partir de año/mes/día (evita corrimientos por huso horario) */
function dateUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function isoFromUTC(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Devuelve fecha ISO (YYYY-MM-DD) sumando deltaDias al "hoy" de Lima */
export function fechaLima(deltaDias = 0): string {
  const { year, month, day } = fechaLimaActual();
  const d = dateUTC(year, month, day);
  d.setUTCDate(d.getUTCDate() + deltaDias);
  return isoFromUTC(d);
}

/** Rango Lunes-Domingo de la semana actual (hora Lima) */
export function rangoSemanaActual(): { inicio: string; fin: string } {
  const { year, month, day } = fechaLimaActual();
  const hoy = dateUTC(year, month, day);
  const diaSemana = hoy.getUTCDay(); // 0 = domingo
  const lunes = new Date(hoy);
  lunes.setUTCDate(hoy.getUTCDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
  const domingo = new Date(lunes);
  domingo.setUTCDate(lunes.getUTCDate() + 6);
  return { inicio: isoFromUTC(lunes), fin: isoFromUTC(domingo) };
}

/** Rango del 1ro del mes actual hasta hoy (hora Lima) */
export function rangoMesActual(): { inicio: string; fin: string } {
  const { year, month } = fechaLimaActual();
  const inicio = dateUTC(year, month, 1);
  return { inicio: isoFromUTC(inicio), fin: fechaLima(0) };
}

/** Rango desde el 1ro del mes hace (cantidadMeses-1) meses, hasta hoy (hora Lima) */
export function rangoUltimosMeses(cantidadMeses: number): { inicio: string; fin: string } {
  const { year, month } = fechaLimaActual();
  let mesInicio = month - (cantidadMeses - 1);
  let anioInicio = year;
  while (mesInicio <= 0) {
    mesInicio += 12;
    anioInicio -= 1;
  }
  const inicio = dateUTC(anioInicio, mesInicio, 1);
  return { inicio: isoFromUTC(inicio), fin: fechaLima(0) };
}

/** Formatea fecha local como "01/Jun/2026" */
export function fmtFecha(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** Formatea número como S/ 1,234.56 */
export function fmtSoles(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Capitaliza primera letra */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Devuelve iniciales para avatar (ej: "Alex" → "A", "Juan Pérez" → "JP") */
export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Colores cíclicos para avatares */
const AVATAR_COLORS = ['#5C7A3E', '#D4673A', '#C9A84C', '#2C3E35', '#8A9E8F'];
export function avatarColor(idx: number): string {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}