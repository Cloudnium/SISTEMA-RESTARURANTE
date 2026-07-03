// utils/reportes/exportarReportePdf.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtFecha } from './reportesUtils';
import { LABEL_METODO, LABEL_COMPROBANTE } from '@/constants/reportes/reportesConstants';
import type {
  ReporteResumenPeriodo, ReporteVentasPorMetodoPago, ReporteVentasPorComprobante,
  ReporteTopProductos, ReporteTopCategorias, ReporteTopUsuarios,
  DetalleVentaPDF, ReporteProductoStock,
} from '@/lib/supabase/queries/reportes';

// Tuplas mutables (jspdf-autotable exige [number,number,number], no readonly)
const VERDE: [number, number, number] = [92, 122, 62];
const NEGRO: [number, number, number] = [44, 62, 53];
const GRIS:  [number, number, number] = [120, 120, 120];

function soles(n: number): string {
  return `S/ ${(n ?? 0).toFixed(2)}`;
}

function txt(v: string | null | undefined, fallback = '—'): string {
  return v ?? fallback;
}

function diasEntre(desde: string, hasta: string): number {
  const d1 = new Date(desde + 'T00:00:00');
  const d2 = new Date(hasta + 'T00:00:00');
  return Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
}

interface ExportarReportePdfParams {
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
  /** Logo en base64 (data URL completo, ej: "data:image/png;base64,...") — opcional */
  logoBase64?:    string;
}

export function exportarReportePdf(params: ExportarReportePdfParams) {
  const {
    desde, hasta, resumen, metodosPago, comprobantes,
    topProductos, topCategorias, topUsuarios,
    detalleVentas, agotados, stockBajo, logoBase64,
  } = params;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const dias = diasEntre(desde, hasta);
  const fechaGenerado = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' });

  function titulo(texto: string, y: number) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NEGRO);
    doc.text(texto, margin, y);
    return y + 18;
  }

  function tablaKV(rows: Array<[string, string]>, startY: number, headers: [string, string]) {
    autoTable(doc, {
      startY,
      head: [headers],
      body: rows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: VERDE, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 246, 240] },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (doc as any).lastAutoTable.finalY + 22;
  }

  function tablaDatos(head: string[], body: string[][], startY: number) {
    autoTable(doc, {
      startY,
      head: [head],
      body,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: NEGRO, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 246, 240] },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (doc as any).lastAutoTable.finalY + 22;
  }

  function piePagina() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPaginas = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...GRIS);
      doc.text(
        `Reporte generado el: ${fechaGenerado}`,
        margin, doc.internal.pageSize.getHeight() - 20,
      );
      doc.text(
        `Página ${i} de ${totalPaginas}`,
        pageWidth - margin, doc.internal.pageSize.getHeight() - 20,
        { align: 'right' },
      );
    }
  }

  // ── Encabezado general (con logo si se provee) ─────────────────────────
  // Proporción real del logo MADRE: 357×201 px (ancho:alto ≈ 1.776:1)
  const LOGO_ASPECT = 357 / 201;
  const LOGO_ALTO   = 58;
  const LOGO_ANCHO  = LOGO_ALTO * LOGO_ASPECT; // ≈ 103pt

  let headerTextX = margin;
  let headerTopY  = 40;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 14, LOGO_ANCHO, LOGO_ALTO);
      headerTextX = margin + LOGO_ANCHO + 14;
      headerTopY  = 38; // centra verticalmente el texto respecto al logo
    } catch {
      // Si el logo falla (formato inválido), seguimos sin romper el PDF
    }
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...VERDE);
  doc.text('MADRE · Postres y Café', headerTextX, headerTopY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  doc.text(`Período: ${fmtFecha(desde)} - ${fmtFecha(hasta)}`, headerTextX, headerTopY + 17);

  let y = 105;

  // ── 1. Resumen general ──────────────────────────────────────────────────
  y = titulo('Reporte de Ventas — Resumen General', y);
  y = tablaKV([
    ['Período', `${fmtFecha(desde)} - ${fmtFecha(hasta)}`],
    ['Días del período', String(dias)],
    ['Ventas Totales', soles(resumen?.totalVentas ?? 0)],
    ['Total Transacciones', String(resumen?.totalTransacciones ?? 0)],
    ['Clientes Atendidos', String(resumen?.clientesAtendidos ?? 0)],
    ['Productos Vendidos', String(resumen?.totalProductos ?? 0)],
    ['Ticket Promedio', soles(resumen?.ticketPromedio ?? 0)],
    ['Promedio Diario', soles((resumen?.totalVentas ?? 0) / dias)],
  ], y, ['Métrica', 'Valor']);

  // ── 2. Resumen financiero ───────────────────────────────────────────────
  y = titulo('Resumen Financiero del Período', y);
  const diferencia = (resumen?.totalVentas ?? 0) - (resumen?.totalCompras ?? 0);
  y = tablaKV([
    ['INGRESOS (Ventas del período)', soles(resumen?.totalVentas ?? 0)],
    ['EGRESOS (Compras del período)', soles(resumen?.totalCompras ?? 0)],
    ['DIFERENCIA (Ingresos − Egresos)', soles(diferencia)],
    ['Estado', diferencia >= 0 ? 'SUPERÁVIT' : 'DÉFICIT'],
  ], y, ['Concepto', 'Monto']);

  // ── 3. Ventas por caja/usuario ──────────────────────────────────────────
  if (y > 650) { doc.addPage(); y = 50; }
  y = titulo('Ventas por Caja / Usuario', y);
  const totalVentasGeneral = topUsuarios.reduce((s, u) => s + u.total, 0) || 1;
  y = tablaDatos(
    ['Caja/Usuario', 'Rol', 'Total', 'Trans.', '%', 'Prom/Venta', 'Prom/Día'],
    topUsuarios.map(u => [
      txt(u.nombre), txt(u.rol), soles(u.total), String(u.ventas),
      `${((u.total / totalVentasGeneral) * 100).toFixed(2)}%`,
      soles(u.ventas > 0 ? u.total / u.ventas : 0),
      soles(u.total / dias),
    ]),
    y,
  );

  // ── 4. Top productos / categorías ───────────────────────────────────────
  doc.addPage(); y = 50;
  y = titulo('Top Productos Más Vendidos', y);
  const totalQtyProductos = topProductos.reduce((s, p) => s + p.qty, 0) || 1;
  y = tablaDatos(
    ['#', 'Producto', 'Categoría', 'Cant.', 'Total', '%'],
    topProductos.map((p, i) => [
      String(i + 1), txt(p.nombre), txt(p.categoria), String(p.qty), soles(p.total),
      `${((p.qty / totalQtyProductos) * 100).toFixed(2)}%`,
    ]),
    y,
  );

  if (y > 650) { doc.addPage(); y = 50; }
  y = titulo('Categorías Más Vendidas', y);
  y = tablaDatos(
    ['#', 'Categoría', 'Cantidad', 'Total Vendido', '%'],
    topCategorias.slice(0, 5).map((c, i) => [
      String(i + 1), txt(c.categoria), String(c.qty), soles(c.total), `${c.pct.toFixed(2)}%`,
    ]),
    y,
  );

  // ── 5. Métodos de pago / comprobante ────────────────────────────────────
  doc.addPage(); y = 50;
  y = titulo('Análisis por Método de Pago', y);
  const totalMetodos = metodosPago.reduce((s, m) => s + m.total, 0) || 1;
  y = tablaDatos(
    ['Método de Pago', 'Trans.', 'Total', '%', 'Promedio'],
    metodosPago.map(m => [
      txt(LABEL_METODO[m.metodo_pago] ?? m.metodo_pago), String(m.cantidad), soles(m.total),
      `${((m.total / totalMetodos) * 100).toFixed(2)}%`,
      soles(m.cantidad > 0 ? m.total / m.cantidad : 0),
    ]),
    y,
  );

  if (y > 650) { doc.addPage(); y = 50; }
  y = titulo('Análisis por Tipo de Comprobante', y);
  const totalComprobantesMonto = comprobantes.reduce((s, c) => s + c.total, 0) || 1;
  y = tablaDatos(
    ['Tipo Comprobante', 'Docs.', 'Total', '%', 'Promedio'],
    comprobantes.map(c => [
      txt(LABEL_COMPROBANTE[c.tipo] ?? c.tipo), String(c.cantidad), soles(c.total),
      `${((c.total / totalComprobantesMonto) * 100).toFixed(2)}%`,
      soles(c.cantidad > 0 ? c.total / c.cantidad : 0),
    ]),
    y,
  );

  // ── 6. Detalle de ventas ────────────────────────────────────────────────
  doc.addPage(); y = 50;
  y = titulo(`Detalle de Ventas (primeras ${detalleVentas.length} transacciones)`, y);
  tablaDatos(
    ['Fecha', 'Hora', 'Cliente', 'Vendedor', 'Comp.', 'Items', 'Total'],
    detalleVentas.map(v => [
      fmtFecha(v.fecha_local), txt(v.hora_local), txt(v.cliente_nombre), txt(v.usuario_nombre),
      txt(LABEL_COMPROBANTE[v.tipo_comprobante] ?? v.tipo_comprobante),
      String(v.items_count), soles(v.total),
    ]),
    y,
  );

  // ── 7. Productos agotados ───────────────────────────────────────────────
  if (agotados.length > 0) {
    doc.addPage(); y = 50;
    y = titulo('Productos Agotados — Requieren Reposición Urgente', y);
    tablaDatos(
      ['Nombre', 'Categoría', 'Stock', 'Mín', 'Precio'],
      agotados.map(p => [
        txt(p.nombre), txt(p.categoria), String(p.stock_tienda), String(p.stock_minimo), soles(p.precio),
      ]),
      y,
    );
  }

  // ── 8. Stock bajo ───────────────────────────────────────────────────────
  if (stockBajo.length > 0) {
    doc.addPage(); y = 50;
    y = titulo('Productos con Stock Bajo — Requieren Atención', y);
    tablaDatos(
      ['Nombre', 'Categoría', 'Stock', 'Mín', 'Precio', 'Valor'],
      stockBajo.map(p => [
        txt(p.nombre), txt(p.categoria), String(p.stock_tienda), String(p.stock_minimo),
        soles(p.precio), soles(p.precio * p.stock_tienda),
      ]),
      y,
    );
  }

  piePagina();
  doc.save(`reporte_ventas_${desde}_${hasta}.pdf`);
}