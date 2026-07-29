// constants/insumos/insumosConstants.ts
import type { UnidadKey, FormState, PeriodoFiltro, TipoFiltro } from '@/utils/insumos/insumosUtils';

export const UNIDADES: UnidadKey[] = ['unidades', 'porciones', 'kg', 'litros', 'bolsas', 'cajas'];

export const FORM_VACIO: FormState = {
  nombre: '', categoria: '', unidad_medida: 'unidades',
  stock_tienda: '0', stock_minimo_tienda: '5', precio: '0', costo: '0',
};

export const PERIODO_OPTIONS: { key: PeriodoFiltro; label: string }[] = [
  { key: 'hoy',    label: 'Hoy'    },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mes'    },
];

export const TIPO_OPTIONS: { key: TipoFiltro; label: string }[] = [
  { key: 'todos',   label: 'Todos'   },
  { key: 'consumo', label: 'Consumo' },
  { key: 'ingreso', label: 'Ingreso' },
];

export const POR_PAGINA_PRODUCTOS  = 20;
export const POR_PAGINA_HISTORIAL  = 20;