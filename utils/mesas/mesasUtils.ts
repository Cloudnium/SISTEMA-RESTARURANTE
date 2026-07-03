// utils/mesas/mesasUtils.ts
import type { Mesa } from '@/lib/supabase/types';

export function fmtSoles(n: number | null | undefined): string {
  return `S/ ${(n ?? 0).toFixed(2)}`;
}

// Tipo extendido con datos de la vista v_mesas_con_pedido
export type MesaRow = Mesa & {
  pedido_id?:      string | null;
  pedido_total?:   number | null;
  pedido_inicio?:  string | null;
  minutos_ocupada?: number | null;
  mozo?:           string | null;
};