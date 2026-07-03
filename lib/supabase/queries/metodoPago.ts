// lib/supabase/queries/metodoPago.ts
// Query independiente para el cambio de método de pago de una venta/comprobante.
// No modifica lib/supabase/queries/index.ts — se importa directo desde aquí.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

import { supabase as _supabase } from '../client';
import type { Venta, MetodoPago } from '../types';

const db = _supabase as DB;

/**
 * Cambia el método de pago de una venta ya completada y sincroniza el
 * movimiento de caja correspondiente (vía fn_cambiar_metodo_pago_venta).
 *
 * Requiere haber corrido la migración 2026_06_26_fix_metodo_pago.sql.
 */
export async function actualizarMetodoPagoVenta(
  ventaId: string,
  metodoPago: MetodoPago,
  usuarioId: string,
): Promise<Venta> {
  const { data, error } = await db.rpc('fn_cambiar_metodo_pago_venta', {
    p_venta_id:    ventaId,
    p_metodo_pago: metodoPago,
    p_usuario_id:  usuarioId,
  });
  if (error) throw error;
  return data as Venta;
}