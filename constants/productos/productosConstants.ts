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
  'Piqueos',
  'Ensaladas',
  'Platos de Fondo',
  'Menú del Día',
  'Parrillas',
  'Pastas',
  'Pizzas',
  'Sándwiches y Hamburguesas',
  'Comida Rápida',
  'Guarniciones',
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

/**
 * Ordena una lista de categorías (por ejemplo, las que ya tienen productos)
 * siguiendo el orden lógico de CATEGORIAS_PRODUCTO. Cualquier categoría que
 * no esté en la lista maestra (dato legado / personalizado) se muestra al
 * final, ordenada alfabéticamente. No filtra ni oculta nada — solo ordena.
 */
export function ordenarCategorias(categorias: string[]): string[] {
  return [...categorias].sort((a, b) => {
    const ia = CATEGORIAS_PRODUCTO.indexOf(a);
    const ib = CATEGORIAS_PRODUCTO.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}