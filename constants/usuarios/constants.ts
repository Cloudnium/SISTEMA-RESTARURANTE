// constants/usuarios/constants.ts
import React from 'react';
import { Shield, CreditCard, ChefHat } from 'lucide-react';
import { B } from '@/lib/brand';
import type { RolUsuario } from '@/lib/supabase/types';

// ─── Tipos de filtro ──────────────────────────────────────────────────────────
export type EstadoFiltro = 'todos' | 'activo' | 'inactivo';
export type RolFiltro    = 'todos' | RolUsuario;

// ─── Configuración visual por rol ─────────────────────────────────────────────
export interface RolConfig {
  label: string;
  color: string;
  bg:    string;
  icon:  React.ReactNode;
}

export const ROL_CFG: Record<RolUsuario, RolConfig> = {
  admin:    { label: 'Administrador', color: B.gold,  bg: `${B.gold}18`,  icon: React.createElement(Shield,     { className: 'w-4 h-4' }) },
  cajero:   { label: 'Cajero',        color: B.green, bg: `${B.green}18`, icon: React.createElement(CreditCard, { className: 'w-4 h-4' }) },
  cocinero: { label: 'Cocinero',      color: B.terra, bg: `${B.terra}18`, icon: React.createElement(ChefHat,    { className: 'w-4 h-4' }) },
};

// ─── Icono por rol (para KpiCard que pide LucideIcon) ─────────────────────────
export const ROL_ICON = {
  admin:    Shield,
  cajero:   CreditCard,
  cocinero: ChefHat,
} as const;