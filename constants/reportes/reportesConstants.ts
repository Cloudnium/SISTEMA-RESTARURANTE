// constants/reportes/reportesConstants.ts

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

export const RANGOS_RAPIDOS = [
  { label: 'Hoy' },
  { label: 'Semana' },
  { label: 'Mes' },
  { label: '3 meses' },
] as const;

export const COLORES_METODO: Record<string, string> = {
  efectivo:      '#5C7A3E',
  tarjeta:       '#2C3E35',
  yape:          '#7B2FF7',
  plin:          '#00C2A8',
  transferencia: '#C9A84C',
  izipay:        '#D4673A',
};

export const COLORES_COMPROBANTE: Record<string, string> = {
  nota_venta: '#C9A84C',
  boleta:     '#5C7A3E',
  factura:    '#2C3E35',
};

export const LABEL_COMPROBANTE: Record<string, string> = {
  nota_venta: 'Nota De Venta',
  boleta:     'Boleta',
  factura:    'Factura',
};

export const LABEL_METODO: Record<string, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  yape:          'Yape',
  plin:          'Plin',
  transferencia: 'Transferencia',
  izipay:        'IziPay',
};