// constants/almacen/almacenConstants.ts

// Formulario de creación / edición de insumo (producto tipo 'insumo').
export interface ProductoForm {
  nombre: string;
  categoria: string;
  precio: string;
  unidad_medida: string;
  stock_minimo_cocina: string;
  stock_cocina: string;
}

export const PROD_VACIO: ProductoForm = {
  nombre: '', categoria: '', precio: '0',
  unidad_medida: 'unidades', stock_minimo_cocina: '0', stock_cocina: '0',
};

export const UNIDADES_MEDIDA = ['unidades', 'porciones', 'kg', 'litros', 'bolsas', 'cajas'];