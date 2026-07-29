// utils/almacen/exportarAlmacenExcel.ts
import * as XLSX from 'xlsx';
import type { Producto } from '@/lib/supabase/types';

function txt(v: string | null | undefined, fallback = '—'): string {
  return v ?? fallback;
}

function estadoDe(stock: number, minimo: number): string {
  if (stock <= 0) return 'AGOTADO';
  if (minimo > 0 && stock < minimo) return 'STOCK BAJO';
  return 'OK';
}

// Ancho de columnas por cantidad de encabezados (misma heurística usada en
// utils/reportes/exportarReporteExcel.ts, para mantener el mismo criterio).
function autoCols(headers: string[]): Array<{ wch: number }> {
  return headers.map(h => ({ wch: Math.max(12, h.length + 4) }));
}

function hojaDesdeFilas(libro: XLSX.WorkBook, nombre: string, filas: Record<string, unknown>[]) {
  const hoja = XLSX.utils.json_to_sheet(filas);
  if (filas.length > 0) {
    hoja['!cols'] = autoCols(Object.keys(filas[0]));
  }
  // Los nombres de hoja de Excel están limitados a 31 caracteres
  XLSX.utils.book_append_sheet(libro, hoja, nombre.slice(0, 31));
}

/**
 * Exporta el inventario de Almacén (insumos) a un archivo Excel con 3 hojas:
 * 1. Inventario Almacén — listado completo con estado calculado
 * 2. Productos Agotados — stock_cocina === 0
 * 3. Stock Bajo — 0 < stock_cocina < stock_minimo_cocina
 *
 * Recibe la misma lista de insumos que ya usa AlmacenView (insumosBase),
 * para no duplicar el criterio de filtrado tipo === 'insumo' && activo.
 */
export function exportarAlmacenExcel(insumos: Producto[]) {
  const libro = XLSX.utils.book_new();
  const fecha = new Date().toISOString().slice(0, 10);

  const filas = insumos
    .slice()
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(p => ({
      'Nombre':    txt(p.nombre),
      'Categoría': txt(p.categoria),
      'Unidad':    txt(p.unidad_medida),
      'Stock':     p.stock_cocina,
      'Mínimo':    p.stock_minimo_cocina,
      'Precio':    p.precio,
      'Valor':     Number((p.stock_cocina * p.precio).toFixed(2)),
      'Estado':    estadoDe(p.stock_cocina, p.stock_minimo_cocina),
    }));

  // ── 1. Inventario completo ──────────────────────────────────────────────
  hojaDesdeFilas(libro, 'Inventario Almacén', filas);

  // ── 2. Productos agotados ───────────────────────────────────────────────
  const agotados = filas.filter(f => f.Estado === 'AGOTADO');
  if (agotados.length > 0) {
    hojaDesdeFilas(libro, 'Productos Agotados', agotados);
  }

  // ── 3. Stock bajo ───────────────────────────────────────────────────────
  const stockBajo = filas.filter(f => f.Estado === 'STOCK BAJO');
  if (stockBajo.length > 0) {
    hojaDesdeFilas(libro, 'Stock Bajo', stockBajo);
  }

  XLSX.writeFile(libro, `almacen_inventario_${fecha}.xlsx`);
}