// constants/comprobantesConstants.ts
import type { TipoComprobante, MetodoPago } from '@/lib/supabase/types';

// ─── Config visual por tipo ────────────────────────────────────────────────────
export const TIPO_CFG: Record<TipoComprobante, {
  label: string; bg: string; color: string; headerLabel: string;
}> = {
  boleta:     { label: 'Boleta',        bg: '#e8f5e2', color: '#5C7A3E', headerLabel: 'BOLETA DE VENTA'     },
  nota_venta: { label: 'Nota de Venta', bg: '#fdf8e6', color: '#C9A84C', headerLabel: 'NOTA DE VENTA'       },
  factura:    { label: 'Factura',       bg: '#e8f0fb', color: '#4A6FA5', headerLabel: 'FACTURA ELECTRÓNICA' },
};

export const METODO_LABEL: Record<string, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  yape:          'Yape',
  plin:          'Plin',
  transferencia: 'Transferencia',
  izipay:        'Izipay',
};

export const POR_PAGINA   = 15;
export const LIMITE_FETCH = 1000;

// ─── Tipos locales reutilizables ───────────────────────────────────────────────
export type SortDir        = 'asc' | 'desc';
export type TipoFiltro     = 'todos' | TipoComprobante;
export type EstadoFiltro   = 'todos' | 'emitido' | 'anulado';
export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';

export type VentaItem = {
  id:              string;
  cantidad:        number;
  precio_unitario: number;
  subtotal:        number;
  producto: { nombre: string; categoria: string } | null;
};

export type CompDetalle = {
  id:              string;
  numero:          string;
  tipo:            TipoComprobante;
  estado:          'emitido' | 'anulado';
  fecha_emision:   string;
  monto:           number;
  metodo_pago:     MetodoPago;
  cliente_nombre:  string | null;
  dni:             string | null;
  ruc:             string | null;
  usuario_nombre:  string;
  venta_id:        string | null;
  subtotal?:       number;
  igv?:            number;
  descuento_monto?:  number;
  monto_recibido?:   number;
  vuelto?:           number;
  notas?:            string;
  serie?:            string;
  correlativo?:      number;
  venta_fecha_local?: string | null;
  // Cargados bajo demanda
  items?:       VentaItem[];
  itemsLoaded?: boolean;
};