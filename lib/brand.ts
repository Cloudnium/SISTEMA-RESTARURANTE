//lib/brand.ts
// ─── Brand tokens ─────────────────────────────────────────────────────────────
// Single source of truth for MADRE · Postres y Café color palette
export const B = {
  charcoal:     '#2C3E35',
  charcoalLight:'#3D5247',
  cream:        '#F5EDD8',
  creamDark:    '#EAD9BC',
  green:        '#5C7A3E',
  greenLight:   '#7A9E56',
  terra:        '#D4673A',
  terraLight:   '#E07B4E',
  gold:         '#C9A84C',
  goldLight:    '#DFC06A',
  white:        '#FDFAF4',
  muted:        '#8A9E8F',
  pageBg:       '#EDE5CE',
} as const;

// ─── Menu structure ────────────────────────────────────────────────────────────
import {
  LayoutDashboard, ShoppingCart, ChefHat, Package, Users, FileText,
  BarChart3, Building2, CreditCard, Warehouse, Truck, Database, UtensilsCrossed,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
      { id: 'mesas',       label: 'Mesas',            icon: UtensilsCrossed },
      { id: 'ventas',      label: 'Punto de Venta',   icon: ShoppingCart },
    ],
  },
  {
    title: 'Cocina',
    items: [
      { id: 'produccion',  label: 'Producción',       icon: ChefHat },
      { id: 'insumos',     label: 'Insumos',          icon: Package },
      { id: 'almacen',     label: 'Almacén',          icon: Warehouse },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { id: 'clientes',    label: 'Clientes',         icon: Users },
      { id: 'usuarios',    label: 'Usuarios',         icon: Building2 },
      { id: 'cajas',       label: 'Cajas',            icon: CreditCard },
    ],
  },
  {
    title: 'Documentos',
    items: [
      { id: 'comprobantes',label: 'Comprobantes',     icon: FileText },
      { id: 'compras',     label: 'Compras',          icon: Truck },
      { id: 'reportes',    label: 'Reportes',         icon: BarChart3 },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      { id: 'respaldo',    label: 'Respaldo',         icon: Database },
    ],
  },
];