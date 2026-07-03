// constants/mesas/mesasConstants.ts
import {
  CircleCheck, UtensilsCrossed, Sparkles, CalendarClock,
  Banknote, CreditCard, Smartphone,
  Receipt, Building2, StickyNote,
} from 'lucide-react';
import type { EstadoMesa, MetodoPago, TipoComprobante } from '@/lib/supabase/types';
import React from 'react';

export interface EstadoConfig {
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
}

export const ESTADOS: Record<EstadoMesa, EstadoConfig> = {
  disponible: { label: 'Disponible', color: '#5C7A3E', bg: '#e8f5e2', icon: CircleCheck    },
  ocupada:    { label: 'Ocupada',    color: '#D4673A', bg: '#fef0e6', icon: UtensilsCrossed },
  limpieza:   { label: 'Limpieza',   color: '#C9A84C', bg: '#fdf8e6', icon: Sparkles        },
  reservada:  { label: 'Reservada',  color: '#4A6FA5', bg: '#e8f0fb', icon: CalendarClock   },
};

export const ICONOS: Record<EstadoMesa, string> = {
  disponible: '/icons/disponible.png',
  ocupada:    '/icons/ocupada.png',
  limpieza:   '/icons/limpieza.png',
  reservada:  '/icons/reservada.png',
};

export const COLOR_FILTERS: Record<EstadoMesa, string> = {
  disponible: 'invert(38%) sepia(28%) saturate(600%) hue-rotate(60deg) brightness(90%)',
  ocupada:    'invert(45%) sepia(60%) saturate(700%) hue-rotate(340deg) brightness(95%)',
  limpieza:   'invert(65%) sepia(50%) saturate(600%) hue-rotate(10deg) brightness(95%)',
  reservada:  'invert(35%) sepia(40%) saturate(600%) hue-rotate(190deg) brightness(90%)',
};

export const ESTADOS_CIERRAN_MODAL: EstadoMesa[] = ['disponible', 'limpieza', 'reservada'];

export const METODOS_PAGO: { id: MetodoPago; label: string; icon: React.ElementType }[] = [
  { id: 'efectivo',      label: 'Efectivo', icon: Banknote   },
  { id: 'tarjeta',       label: 'Tarjeta',  icon: CreditCard },
  { id: 'yape',          label: 'Yape',     icon: Smartphone },
  { id: 'plin',          label: 'Plin',     icon: Smartphone },
  { id: 'transferencia', label: 'Transfer', icon: CreditCard },
  { id: 'izipay',        label: 'Izipay',   icon: CreditCard },
];

export const COMPROBANTES: {
  id: TipoComprobante;
  label: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  { id: 'boleta',     label: 'Boleta',        icon: Receipt,    desc: 'Consumidor final' },
  { id: 'factura',    label: 'Factura',       icon: Building2,  desc: 'Con RUC empresa'  },
  { id: 'nota_venta', label: 'Nota de Venta', icon: StickyNote, desc: 'Sin IGV separado' },
];