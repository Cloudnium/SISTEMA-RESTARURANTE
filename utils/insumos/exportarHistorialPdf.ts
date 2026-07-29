// utils/insumos/exportarHistorialPdf.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtLimaFecha, fmtLimaHora, type HistorialItem } from './insumosUtils';

// Tuplas mutables (jspdf-autotable exige [number,number,number], no readonly)
const VERDE: [number, number, number] = [92, 122, 62];
const TERRA: [number, number, number] = [212, 103, 58];
const NEGRO: [number, number, number] = [44, 62, 53];
const GRIS:  [number, number, number] = [120, 120, 120];

interface ExportarHistorialPdfParams {
  items: HistorialItem[];
  periodoLabel: string;
  tipoLabel: string;
  busqueda: string;
  totalConsumo: number;
  totalIngreso: number;
}

export function exportarHistorialPdf(params: ExportarHistorialPdfParams) {
  const { items, periodoLabel, tipoLabel, busqueda, totalConsumo, totalIngreso } = params;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const fechaGenerado = new Date().toLocaleString('es-PE', {
    timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'medium',
  });

  // ── Encabezado ───────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...VERDE);
  doc.text('MADRE · Postres y Café', margin, 40);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NEGRO);
  doc.text('Historial de Movimientos', margin, 60);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  const filtroTxt = `Período: ${periodoLabel}   ·   Tipo: ${tipoLabel}${busqueda.trim() ? `   ·   Producto: "${busqueda.trim()}"` : ''}`;
  doc.text(filtroTxt, margin, 76);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: 92,
    head: [['Total consumido', 'Total ingresado']],
    body: [[totalConsumo.toFixed(2), totalIngreso.toFixed(2)]],
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 6, halign: 'center' },
    headStyles: { fillColor: NEGRO, textColor: 255, fontStyle: 'bold' },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startYTabla = (doc as any).lastAutoTable.finalY + 20;

  // ── Tabla de movimientos ────────────────────────────────────────────────
  autoTable(doc, {
    startY: startYTabla,
    head: [['Fecha', 'Hora', 'Producto', 'Movimiento', 'Stock res.', 'Motivo', 'Usuario']],
    body: items.map(h => [
      fmtLimaFecha(h.created_at),
      fmtLimaHora(h.created_at),
      h.producto_nombre,
      `${h.delta < 0 ? '' : '+'}${h.delta.toFixed(2)}`,
      h.stock_resultante.toFixed(2),
      h.observacion ?? '—',
      h.usuario_nombre ?? '—',
    ]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: VERDE, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 246, 240] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const item = items[data.row.index];
        if (item) {
          data.cell.styles.textColor = item.delta < 0 ? TERRA : VERDE;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ── Pie de página ────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPaginas = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(`Generado el: ${fechaGenerado}`, margin, doc.internal.pageSize.getHeight() - 20);
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
  }

  const fecha = new Date().toISOString().split('T')[0];
  doc.save(`historial_movimientos_${periodoLabel}_${tipoLabel}_${fecha}.pdf`);
}