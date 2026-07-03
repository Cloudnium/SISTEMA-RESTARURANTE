// components/compras/constants/comprasConstants.ts
import type { TipoComprobanteCompra, ZonaAlmacen } from '@/lib/supabase/types';

export const TIPOS_COMP: TipoComprobanteCompra[] = [
  'factura',
  'boleta',
  'nota_venta',
  'recibo',
  'otro',
];

export const ZONAS_DESTINO: { value: ZonaAlmacen; label: string }[] = [
  { value: 'cocina',  label: 'Cocina'  },
  { value: 'tienda',  label: 'Tienda'  },
  { value: 'general', label: 'General' },
];

export const HOY = new Date().toISOString().split('T')[0];