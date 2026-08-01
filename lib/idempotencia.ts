// lib/idempotencia.ts
//
// Ayuda a que una operación sensible (cobrar una venta, registrar un egreso)
// se pueda reintentar sin duplicarse cuando la conexión falla a mitad de
// camino. La clave: generar UNA key por intento de "checkout" (no una nueva
// en cada click de "Confirmar") y reutilizarla si el usuario reintenta tras
// un error — el servidor (fn_crear_venta / fn_registrar_egreso_caja) detecta
// la key repetida y devuelve el registro ya creado en vez de duplicarlo.

/** Genera una idempotency key nueva. Úsala una vez por intento de cobro/egreso. */
export function nuevaIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback simple para entornos sin crypto.randomUUID (muy raro en navegadores modernos)
  return `idk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Chequeo rápido de conectividad antes de intentar una operación crítica.
 * No reemplaza el manejo de errores de red (eso sigue en el try/catch de
 * cada función), pero evita que el usuario espere un timeout largo del
 * navegador para enterarse de que no hay internet, y evita que dispare la
 * acción sabiendo de antemano que va a fallar.
 */
export function sinConexion(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export const MENSAJE_SIN_CONEXION =
  'Sin conexión a internet. Espera a que vuelva la señal antes de reintentar — así evitamos boletas o movimientos duplicados.';
