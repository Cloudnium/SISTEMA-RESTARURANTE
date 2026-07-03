// utils/ventaMesaUtils.ts
import type { EstadoMesa, Producto } from '@/lib/supabase/types';
import { CAT_COLORS } from '@/constants/venta-mesa/ventaMesaConstants';

// ─── Tipo local de mesa con datos del pedido activo ───────────────────────────
export type MesaRow = {
  id: string;
  numero: string;
  nombre: string;
  zona: string;
  capacidad: number;
  estado: EstadoMesa;
  pedido_id?: string | null;
  pedido_total?: number | null;
  pedido_inicio?: string | null;
  minutos_ocupada?: number | null;
  mozo?: string | null;
};

// ─── Tipo item del carrito local ──────────────────────────────────────────────
export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  notas: string;
}

// ─── Helpers de formato ───────────────────────────────────────────────────────
export function fmtSoles(n: number) {
  return `S/ ${n.toFixed(2)}`;
}

export function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

// ─── Color de categoría determinístico ───────────────────────────────────────
export function catColor(cat: string) {
  let h = 0;
  for (const c of cat) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return CAT_COLORS[h % CAT_COLORS.length];
}