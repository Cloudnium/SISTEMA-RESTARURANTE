// utils/insumos/exportarHistorialExcel.ts
import * as XLSX from 'xlsx';
import { fmtLimaFecha, fmtLimaHora, type HistorialItem } from './insumosUtils';

interface ExportarHistorialExcelParams {
  items: HistorialItem[];
  rangoLabel: string;
  tipoLabel: string;
  productoLabel: string;
}

export function exportarHistorialExcel({ items, rangoLabel, tipoLabel, productoLabel }: ExportarHistorialExcelParams) {
  const filas = items.map(h => ({
    'Fecha':            fmtLimaFecha(h.created_at),
    'Hora':             fmtLimaHora(h.created_at),
    'Producto':         h.producto_nombre,
    'Categoría':        h.categoria,
    'Tipo':             h.delta < 0 ? 'Salida' : 'Entrada',
    'Motivo':           h.observacion ?? '',
    'Cantidad':         h.delta,
    'Stock antes':      h.stock_antes,
    'Stock después':    h.stock_resultante,
    'Usuario':          h.usuario_nombre ?? '',
  }));

  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 28 }, { wch: 16 }, { wch: 10 },
    { wch: 32 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
  ];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Historial');

  const fecha = new Date().toISOString().split('T')[0];
  const filtroTxt = productoLabel && productoLabel !== 'Todos los productos'
    ? `_${productoLabel.trim().replace(/\s+/g, '-')}` : '';
  const rangoTxt = rangoLabel.replace(/\//g, '-').replace(/\s+/g, '');
  XLSX.writeFile(libro, `historial_movimientos_${rangoTxt}_${tipoLabel}${filtroTxt}_${fecha}.xlsx`);
}
