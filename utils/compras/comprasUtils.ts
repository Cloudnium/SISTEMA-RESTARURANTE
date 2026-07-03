// components/compras/utils/comprasUtils.ts
import { B } from '@/lib/brand';
import type { TipoComprobanteCompra, ZonaAlmacen } from '@/lib/supabase/types';

// ─── Helpers de estilo ────────────────────────────────────────────────────────
export function inputCls(extra = '') {
  return `w-full px-3 py-2.5 rounded-xl text-sm outline-none ${extra}`;
}

export const INP: React.CSSProperties = {
  background: B.cream,
  border: `1px solid ${B.creamDark}`,
  color: B.charcoal,
};

// ─── Tipos del formulario ─────────────────────────────────────────────────────
export interface CompraItem {
  descripcion:     string;
  cantidad:        string;
  precio_unitario: string;
  zona_destino:    ZonaAlmacen;
}

export interface FormState {
  tipo_comprobante: TipoComprobanteCompra;
  serie:            string;
  numero:           string;
  fecha_emision:    string;
  proveedor_nombre: string;
  proveedor_doc:    string;
  descripcion:      string;
  igv_incluido:     boolean;
  items:            CompraItem[];
}

// ─── Estado vacío del formulario ──────────────────────────────────────────────
export const FORM_VACIO: FormState = {
  tipo_comprobante: 'factura',
  serie:            '',
  numero:           '',
  fecha_emision:    new Date().toISOString().split('T')[0],
  proveedor_nombre: '',
  proveedor_doc:    '',
  descripcion:      '',
  igv_incluido:     true,
  items: [
    { descripcion: '', cantidad: '1', precio_unitario: '', zona_destino: 'cocina' },
  ],
};

// ─── Cálculo de totales ───────────────────────────────────────────────────────
export function calcularTotales(items: CompraItem[], igv_incluido: boolean) {
  const totalItems = items.reduce((a, i) => {
    return a + parseFloat(i.cantidad || '0') * parseFloat(i.precio_unitario || '0');
  }, 0);
  const igv     = igv_incluido ? (totalItems * 0.18) / 1.18 : totalItems * 0.18;
  const baseImp = igv_incluido ? totalItems - igv : totalItems;
  const total   = igv_incluido ? totalItems : totalItems + igv;
  return { igv, baseImp, total };
}