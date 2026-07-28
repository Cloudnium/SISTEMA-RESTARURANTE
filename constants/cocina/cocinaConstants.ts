// constants/cocina/cocinaConstants.ts
import type { EstadoPedido } from '@/lib/supabase/types';

// Configuración visual de los dos estados de item que maneja el KDS.
// (Los otros valores de EstadoPedido — abierto/entregado/cancelado — no se
// muestran en esta pantalla, se manejan en Venta Mesa y en el cobro).
export const ITEM_ESTADO_CFG: Partial<Record<EstadoPedido, { label: string; color: string; bg: string }>> = {
  enviado_cocina: { label: 'Pendiente', color: '#D4673A', bg: '#fef0e6' },
  listo:          { label: 'Listo',     color: '#5C7A3E', bg: '#e8f5e2' },
};

// Umbrales de urgencia según minutos de espera del item pendiente más antiguo del ticket
export const UMBRAL_ATENCION = 10; // minutos
export const UMBRAL_URGENTE  = 20; // minutos

export const URGENCIA_CFG = {
  normal:   { label: 'A tiempo',  color: '#5C7A3E', bg: '#e8f5e2' },
  atencion: { label: 'Atención',  color: '#C9A84C', bg: '#fdf8e6' },
  urgente:  { label: 'Urgente',   color: '#D4673A', bg: '#fef0e6' },
} as const;

export type NivelUrgencia = keyof typeof URGENCIA_CFG;