// constants/productos/productosConstants.ts
// Lista maestra de categorías de productos de venta (menú) para el restaurante.
// Se usa en los formularios de creación/edición de productos y en los filtros
// de las vistas (Productos, Punto de Venta, Venta Mesa) para que todas
// muestren y ordenen las categorías de forma consistente.
//
// Nota: la columna `categoria` en la tabla `productos` sigue siendo texto libre
// (no se tocó el esquema de Supabase), así que un producto puede tener una
// categoría fuera de esta lista (dato legado o "Otra") y seguirá funcionando
// con normalidad en toda la app.

export const CATEGORIAS_PRODUCTO: string[] = [
  'Desayunos',
  'Entradas',
  'Sopas y Cremas',
  'Piqueos y Entremeses',
  'Ensaladas',
  'Platos de Fondo',
  'Menú del Día',
  'Parrillas',
  'Pastas',
  'Pizzas',
  'Sándwiches y Hamburguesas',
  'Comida Rápida',
  'Guarniciones y Adicionales',
  'Salsas y Aderezos',
  'Panadería',
  'Pastelería y Tortas',
  'Postres',
  'Postres Fríos',
  'Helados',
  'Café e Infusiones',
  'Bebidas Calientes',
  'Jugos y Refrescos',
  'Bebidas Gaseosas',
  'Batidos y Smoothies',
  'Cócteles y Bar',
  'Cervezas y Licores',
  'Combos y Promociones',
  'Otros',
];

// Valor "sentinela" usado solo en el <select> del formulario para activar el
// modo "categoría personalizada". Nunca se guarda en la base de datos.
export const CATEGORIA_OTRA = '__otra__';

// Lista maestra de categorías de INSUMOS (materia prima de almacén: Lácteos,
// Cereales, etc.). Es distinta de CATEGORIAS_PRODUCTO porque conceptualmente
// son cosas distintas: un insumo no es un producto de venta del menú.
export const CATEGORIAS_INSUMO: string[] = [
  'Lácteos',
  'Huevos',
  'Carnes y Embutidos',
  'Aves',
  'Pescados y Mariscos',
  'Verduras y Hortalizas',
  'Frutas',
  'Cereales y Granos',
  'Harinas y Insumos de Panadería',
  'Insumos Secos',
  'Condimentos y Especias',
  'Aceites y Grasas',
  'Endulzantes',
  'Chocolatería y Coberturas',
  'Frutos Secos',
  'Conservas',
  'Congelados',
  'Bebidas e Insumos Líquidos',
  'Envases y Empaques',
  'Limpieza e Higiene',
  'Desechables',
  'Gas y Combustible',
  'Otros',
];

/**
 * Ordena una lista de categorías (por ejemplo, las que ya tienen productos)
 * siguiendo el orden lógico de una lista maestra (por defecto CATEGORIAS_PRODUCTO,
 * pero también sirve para CATEGORIAS_INSUMO pasándola como segundo argumento).
 * Cualquier categoría que no esté en la lista maestra (dato legado / personalizado)
 * se muestra al final, ordenada alfabéticamente. No filtra ni oculta nada — solo ordena.
 */
export function ordenarCategorias(categorias: string[], listaBase: string[] = CATEGORIAS_PRODUCTO): string[] {
  return [...categorias].sort((a, b) => {
    const ia = listaBase.indexOf(a);
    const ib = listaBase.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}