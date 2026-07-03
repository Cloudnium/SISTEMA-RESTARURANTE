import { Banknote, CreditCard, Smartphone } from 'lucide-react';
import type { MetodoPago, TipoComprobante } from '@/lib/supabase/types';
import type { Cliente } from '@/lib/supabase/types';

export const POR_PAGINA = 12;

// DNI real del cliente "Cliente General" que existe en tu BD.
// Se usa para encontrarlo dentro de la lista de clientes reales.
export const CLIENTE_GENERAL_DNI = '87654321';

// Busca el cliente real "Cliente General" en la lista cargada desde Supabase.
// Si todavía no está cargado (o no existe), devuelve null — NUNCA inventa un cliente.
export function getClienteGeneral(clientes: Cliente[]): Cliente | null {
  return (
    clientes.find(
      (c) =>
        c.dni === CLIENTE_GENERAL_DNI ||
        c.nombre.trim().toLowerCase() === 'cliente general',
    ) ?? null
  );
}

// Determina si un cliente (ya seleccionado) corresponde al "Cliente General" real.
export function esClienteGeneral(cliente: Cliente | null): boolean {
  if (!cliente) return false;
  return (
    cliente.dni === CLIENTE_GENERAL_DNI ||
    cliente.nombre.trim().toLowerCase() === 'cliente general'
  );
}

export const METODOS_PAGO: { key: MetodoPago; label: string; icon: React.ElementType }[] = [
  { key: 'efectivo',      label: 'Efectivo', icon: Banknote   },
  { key: 'tarjeta',       label: 'Tarjeta',  icon: CreditCard },
  { key: 'yape',          label: 'Yape',     icon: Smartphone },
  { key: 'plin',          label: 'Plin',     icon: Smartphone },
  { key: 'transferencia', label: 'Transfer', icon: CreditCard },
  { key: 'izipay',        label: 'Izipay',   icon: CreditCard },
];

export const COMPROBANTES: { id: TipoComprobante; label: string; desc: string }[] = [
  { id: 'boleta',     label: 'Boleta',        desc: 'Consumidor final' },
  { id: 'factura',    label: 'Factura',       desc: 'Con RUC empresa'  },
  { id: 'nota_venta', label: 'Nota de Venta', desc: 'Sin IGV separado' },
];

export const COLOR_VENTA = '#7C3AED';