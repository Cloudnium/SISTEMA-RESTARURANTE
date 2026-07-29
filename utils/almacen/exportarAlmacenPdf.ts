// utils/almacen/exportarAlmacenPdf.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Producto } from '@/lib/supabase/types';

// Tuplas mutables (jspdf-autotable exige [number,number,number], no readonly)
const VERDE: [number, number, number] = [92, 122, 62];
const TERRA: [number, number, number] = [212, 103, 58];
const NEGRO: [number, number, number] = [44, 62, 53];
const GRIS:  [number, number, number] = [120, 120, 120];

function soles(n: number): string {
  return `S/ ${(n ?? 0).toFixed(2)}`;
}

function txt(v: string | null | undefined, fallback = '—'): string {
  return v ?? fallback;
}

function estadoDe(stock: number, minimo: number): string {
  if (stock <= 0) return 'AGOTADO';
  if (minimo > 0 && stock < minimo) return 'STOCK BAJO';
  return 'OK';
}

interface ExportarAlmacenPdfParams {
  insumos: Producto[];
  /** Logo en base64 (data URL completo, ej: "data:image/png;base64,...") — opcional */
  logoBase64?: string;
}

/**
 * Exporta el inventario de Almacén (insumos) a PDF, con el mismo criterio
 * visual que utils/reportes/exportarReportePdf.ts (encabezado con logo,
 * tablas con jspdf-autotable, pie de página con fecha y N° de página).
 */
export function exportarAlmacenPdf(params: ExportarAlmacenPdfParams) {
  const { insumos, logoBase64 } = params;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const fechaGenerado = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' });
  const fechaArchivo = new Date().toISOString().slice(0, 10);

  function titulo(texto: string, y: number) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NEGRO);
    doc.text(texto, margin, y);
    return y + 18;
  }

  function tablaDatos(head: string[], body: string[][], startY: number, headColor: [number, number, number] = NEGRO) {
    autoTable(doc, {
      startY,
      head: [head],
      body,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: headColor, textColor: 255, fontStyle: 'bold' },
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
  const LOGO_ASPECT = 357 / 201;
  const LOGO_ALTO   = 58;
  const LOGO_ANCHO  = LOGO_ALTO * LOGO_ASPECT;

  let headerTextX = margin;
  let headerTopY  = 40;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 14, LOGO_ANCHO, LOGO_ALTO);
      headerTextX = margin + LOGO_ANCHO + 14;
      headerTopY  = 38;
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
  doc.text('Reporte de Inventario — Almacén', headerTextX, headerTopY + 17);

  let y = 105;

  const filas = insumos
    .slice()
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(p => ({
      nombre: p.nombre, categoria: p.categoria, unidad: p.unidad_medida,
      stock: p.stock_cocina, minimo: p.stock_minimo_cocina, precio: p.precio,
      valor: p.stock_cocina * p.precio,
      estado: estadoDe(p.stock_cocina, p.stock_minimo_cocina),
    }));

  // ── 1. Resumen ───────────────────────────────────────────────────────────
  const valorTotal = filas.reduce((a, f) => a + f.valor, 0);
  const agotados = filas.filter(f => f.estado === 'AGOTADO');
  const stockBajo = filas.filter(f => f.estado === 'STOCK BAJO');

  y = titulo('Resumen General', y);
  y = tablaDatos(
    ['Métrica', 'Valor'],
    [
      ['Total de insumos', String(filas.length)],
      ['Productos agotados', String(agotados.length)],
      ['Stock bajo', String(stockBajo.length)],
      ['Valor total en almacén', soles(valorTotal)],
    ],
    y,
    VERDE,
  );

  // ── 2. Inventario completo ─────────────────────────────────────────────
  if (y > 650) { doc.addPage(); y = 50; }
  y = titulo('Inventario Completo', y);
  y = tablaDatos(
    ['Nombre', 'Categoría', 'Unidad', 'Stock', 'Mín', 'Precio', 'Valor', 'Estado'],
    filas.map(f => [
      txt(f.nombre), txt(f.categoria), txt(f.unidad), String(f.stock), String(f.minimo),
      soles(f.precio), soles(f.valor), f.estado,
    ]),
    y,
  );

  // ── 3. Productos agotados ───────────────────────────────────────────────
  if (agotados.length > 0) {
    doc.addPage(); y = 50;
    y = titulo('Productos Agotados — Requieren Reposición Urgente', y);
    tablaDatos(
      ['Nombre', 'Categoría', 'Unidad', 'Mín', 'Precio'],
      agotados.map(f => [txt(f.nombre), txt(f.categoria), txt(f.unidad), String(f.minimo), soles(f.precio)]),
      y,
      TERRA,
    );
  }

  // ── 4. Stock bajo ───────────────────────────────────────────────────────
  if (stockBajo.length > 0) {
    doc.addPage(); y = 50;
    y = titulo('Productos con Stock Bajo — Requieren Atención', y);
    tablaDatos(
      ['Nombre', 'Categoría', 'Unidad', 'Stock', 'Mín', 'Precio', 'Valor'],
      stockBajo.map(f => [
        txt(f.nombre), txt(f.categoria), txt(f.unidad), String(f.stock), String(f.minimo),
        soles(f.precio), soles(f.valor),
      ]),
      y,
      TERRA,
    );
  }

  piePagina();
  doc.save(`almacen_inventario_${fechaArchivo}.pdf`);
}