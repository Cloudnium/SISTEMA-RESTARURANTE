// constants/cajasConstants.ts
// Single source of truth para labels, zonas y estilos de estado de Cajas

export const ZONAS_CAJA = [
  { value: '',               label: 'Sin zona específica'  },
  { value: 'Salón Principal', label: 'Salón Principal'      },
  { value: 'Terraza',        label: 'Terraza'              },
  { value: 'Barra',          label: 'Barra'                },
] as const;

export type ZonaCaja = typeof ZONAS_CAJA[number]['value'];

export const ESTADO_CAJA_STYLES = {
  abierta: {
    background: '#e8f5e2',
    color:      '#5C7A3E',
    label:      'Abierta',
  },
  cerrada: {
    background: '#fee2e2',
    color:      '#D4673A',
    label:      'Cerrada',
  },
} as const;

export const EGRESO_ERROR_MESSAGES = {
  sinConcepto:      'Ingresa un concepto',
  sinMonto:         'Ingresa un monto válido',
  saldoInsuficiente:(disponible: number) =>
    `Saldo insuficiente. Disponible: S/ ${disponible.toFixed(2)}`,
} as const;

// ─── Métodos de pago — usados en el resumen del Reporte de Caja ──────────────
export const METODOS_PAGO_LABELS: Record<string, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  yape:          'Yape',
  plin:          'Plin',
  transferencia: 'Transfer.',
  izipay:        'Izipay',
};

export const ORDEN_METODOS_PAGO = [
  'efectivo', 'transferencia', 'tarjeta', 'yape', 'plin', 'izipay',
] as const;