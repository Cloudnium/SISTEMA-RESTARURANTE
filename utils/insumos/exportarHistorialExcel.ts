// utils/insumos/exportarHistorialExcel.ts
import * as XLSX from 'xlsx';
import { fmtLimaFecha, fmtLimaHora, type HistorialItem } from './insumosUtils';

interface ExportarHistorialExcelParams {
  items: HistorialItem[];
  periodoLabel: string;
  tipoLabel: string;
  busqueda: string;
}

export function exportarHistorialExcel({ items, periodoLabel, tipoLabel, busqueda }: ExportarHistorialExcelParams) {
  const filas = items.map(h => ({
    'Fecha':            fmtLimaFecha(h.created_at),
    'Hora':             fmtLimaHora(h.created_at),
    'Producto':         h.producto_nombre,
    'Movimiento':       h.delta < 0 ? 'Consumo' : 'Ingreso',
    'Cantidad':         h.delta,
    'Stock resultante': h.stock_resultante,
    'Motivo':           h.observacion ?? '',
    'Usuario':          h.usuario_nombre ?? '',
  }));

  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 28 }, { wch: 12 },
    { wch: 12 }, { wch: 16 }, { wch: 32 }, { wch: 18 },
  ];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Historial');

  const fecha = new Date().toISOString().split('T')[0];
  const filtroTxt = busqueda.trim() ? `_${busqueda.trim().replace(/\s+/g, '-')}` : '';
  XLSX.writeFile(libro, `historial_movimientos_${periodoLabel}_${tipoLabel}${filtroTxt}_${fecha}.xlsx`);
}