// utils/reportes/exportarReporteExcel.ts
import * as XLSX from 'xlsx';
import { fmtFecha } from './reportesUtils';
import { LABEL_METODO, LABEL_COMPROBANTE } from '@/constants/reportes/reportesConstants';
import type {
  ReporteResumenPeriodo, ReporteVentasPorMetodoPago, ReporteVentasPorComprobante,
  ReporteTopProductos, ReporteTopCategorias, ReporteTopUsuarios,
  DetalleVentaPDF, ReporteProductoStock,
} from '@/lib/supabase/queries/reportes';

function txt(v: string | null | undefined, fallback = '—'): string {
  return v ?? fallback;
}

function diasEntre(desde: string, hasta: string): number {
  const d1 = new Date(desde + 'T00:00:00');
  const d2 = new Date(hasta + 'T00:00:00');
  return Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
}

interface ExportarReporteExcelParams {
  desde: string;
  hasta: string;
  resumen:        ReporteResumenPeriodo | null;
  metodosPago:    ReporteVentasPorMetodoPago[];
  comprobantes:   ReporteVentasPorComprobante[];
  topProductos:   ReporteTopProductos[];
  topCategorias:  ReporteTopCategorias[];
  topUsuarios:    ReporteTopUsuarios[];
  detalleVentas:  DetalleVentaPDF[];
  agotados:       ReporteProductoStock[];
  stockBajo:      ReporteProductoStock[];
}

// Ancho de columnas por cantidad de encabezados (heurística simple, igual
// de utilidad práctica que las anchuras fijas usadas en exportarHistorialExcel).
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

export function exportarReporteExcel(params: ExportarReporteExcelParams) {
  const {
    desde, hasta, resumen, metodosPago, comprobantes,
    topProductos, topCategorias, topUsuarios,
    detalleVentas, agotados, stockBajo,
  } = params;

  const dias = diasEntre(desde, hasta);
  const libro = XLSX.utils.book_new();

  // ── 1. Resumen general ──────────────────────────────────────────────────
  hojaDesdeFilas(libro, 'Resumen General', [
    { Métrica: 'Período', Valor: `${fmtFecha(desde)} - ${fmtFecha(hasta)}` },
    { Métrica: 'Días del período', Valor: dias },
    { Métrica: 'Ventas Totales', Valor: resumen?.totalVentas ?? 0 },
    { Métrica: 'Total Transacciones', Valor: resumen?.totalTransacciones ?? 0 },
    { Métrica: 'Clientes Atendidos', Valor: resumen?.clientesAtendidos ?? 0 },
    { Métrica: 'Productos Vendidos', Valor: resumen?.totalProductos ?? 0 },
    { Métrica: 'Ticket Promedio', Valor: resumen?.ticketPromedio ?? 0 },
    { Métrica: 'Promedio Diario', Valor: (resumen?.totalVentas ?? 0) / dias },
  ]);

  // ── 2. Resumen financiero ───────────────────────────────────────────────
  const diferencia = (resumen?.totalVentas ?? 0) - (resumen?.totalCompras ?? 0);
  hojaDesdeFilas(libro, 'Resumen Financiero', [
    { Concepto: 'INGRESOS (Ventas del período)', Monto: resumen?.totalVentas ?? 0 },
    { Concepto: 'EGRESOS (Compras del período)', Monto: resumen?.totalCompras ?? 0 },
    { Concepto: 'DIFERENCIA (Ingresos − Egresos)', Monto: diferencia },
    { Concepto: 'Estado', Monto: diferencia >= 0 ? 'SUPERÁVIT' : 'DÉFICIT' },
  ]);

  // ── 3. Ventas por caja/usuario ──────────────────────────────────────────
  const totalVentasGeneral = topUsuarios.reduce((s, u) => s + u.total, 0) || 1;
  hojaDesdeFilas(libro, 'Ventas por Caja-Usuario', topUsuarios.map(u => ({
    'Caja/Usuario': txt(u.nombre),
    'Rol':          txt(u.rol),
    'Total':        u.total,
    'Trans.':       u.ventas,
    '%':            Number(((u.total / totalVentasGeneral) * 100).toFixed(2)),
    'Prom/Venta':   u.ventas > 0 ? u.total / u.ventas : 0,
    'Prom/Día':     u.total / dias,
  })));

  // ── 4. Top productos / categorías ───────────────────────────────────────
  const totalQtyProductos = topProductos.reduce((s, p) => s + p.qty, 0) || 1;
  hojaDesdeFilas(libro, 'Top Productos', topProductos.map((p, i) => ({
    '#':         i + 1,
    'Producto':  txt(p.nombre),
    'Categoría': txt(p.categoria),
    'Cant.':     p.qty,
    'Total':     p.total,
    '%':         Number(((p.qty / totalQtyProductos) * 100).toFixed(2)),
  })));

  hojaDesdeFilas(libro, 'Top Categorías', topCategorias.slice(0, 5).map((c, i) => ({
    '#':               i + 1,
    'Categoría':       txt(c.categoria),
    'Cantidad':        c.qty,
    'Total Vendido':   c.total,
    '%':               Number(c.pct.toFixed(2)),
  })));

  // ── 5. Métodos de pago / comprobante ────────────────────────────────────
  const totalMetodos = metodosPago.reduce((s, m) => s + m.total, 0) || 1;
  hojaDesdeFilas(libro, 'Método de Pago', metodosPago.map(m => ({
    'Método de Pago': txt(LABEL_METODO[m.metodo_pago] ?? m.metodo_pago),
    'Trans.':         m.cantidad,
    'Total':          m.total,
    '%':              Number(((m.total / totalMetodos) * 100).toFixed(2)),
    'Promedio':       m.cantidad > 0 ? m.total / m.cantidad : 0,
  })));

  const totalComprobantesMonto = comprobantes.reduce((s, c) => s + c.total, 0) || 1;
  hojaDesdeFilas(libro, 'Tipo de Comprobante', comprobantes.map(c => ({
    'Tipo Comprobante': txt(LABEL_COMPROBANTE[c.tipo] ?? c.tipo),
    'Docs.':            c.cantidad,
    'Total':            c.total,
    '%':                Number(((c.total / totalComprobantesMonto) * 100).toFixed(2)),
    'Promedio':         c.cantidad > 0 ? c.total / c.cantidad : 0,
  })));

  // ── 6. Detalle de ventas ────────────────────────────────────────────────
  hojaDesdeFilas(libro, 'Detalle de Ventas', detalleVentas.map(v => ({
    'Fecha':    fmtFecha(v.fecha_local),
    'Hora':     txt(v.hora_local),
    'Cliente':  txt(v.cliente_nombre),
    'Vendedor': txt(v.usuario_nombre),
    'Comp.':    txt(LABEL_COMPROBANTE[v.tipo_comprobante] ?? v.tipo_comprobante),
    'Items':    v.items_count,
    'Total':    v.total,
  })));

  // ── 7. Productos agotados ───────────────────────────────────────────────
  if (agotados.length > 0) {
    hojaDesdeFilas(libro, 'Productos Agotados', agotados.map(p => ({
      'Nombre':    txt(p.nombre),
      'Categoría': txt(p.categoria),
      'Stock':     p.stock_tienda,
      'Mín':       p.stock_minimo,
      'Precio':    p.precio,
    })));
  }

  // ── 8. Stock bajo ───────────────────────────────────────────────────────
  if (stockBajo.length > 0) {
    hojaDesdeFilas(libro, 'Stock Bajo', stockBajo.map(p => ({
      'Nombre':    txt(p.nombre),
      'Categoría': txt(p.categoria),
      'Stock':     p.stock_tienda,
      'Mín':       p.stock_minimo,
      'Precio':    p.precio,
      'Valor':     p.precio * p.stock_tienda,
    })));
  }

  XLSX.writeFile(libro, `reporte_ventas_${desde}_${hasta}.xlsx`);
}