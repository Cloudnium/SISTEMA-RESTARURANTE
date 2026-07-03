// constants/ventaMesaConstants.ts
import { CircleCheck, UtensilsCrossed, Sparkles, CalendarClock } from 'lucide-react';
import type { EstadoMesa } from '@/lib/supabase/types';

export const ESTADO_CFG: Record<EstadoMesa, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  disponible: { label: 'Disponible', color: '#5C7A3E', bg: '#e8f5e2', icon: CircleCheck     },
  ocupada:    { label: 'Ocupada',    color: '#D4673A', bg: '#fef0e6', icon: UtensilsCrossed  },
  limpieza:   { label: 'Limpieza',   color: '#C9A84C', bg: '#fdf8e6', icon: Sparkles         },
  reservada:  { label: 'Reservada',  color: '#4A6FA5', bg: '#e8f0fb', icon: CalendarClock    },
};

export const CAT_COLORS: string[] = [
  '#5C7A3E', '#D4673A', '#C9A84C', '#4A6FA5', '#8B5CF6', '#06B6D4', '#EC4899',
];