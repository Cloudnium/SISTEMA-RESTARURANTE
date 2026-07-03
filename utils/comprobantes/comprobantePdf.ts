// utils/comprobantes/comprobantePdf.ts
// Genera el PDF formal del comprobante en formato A4, estilo SUNAT
// (recuadro de RUC + tipo de documento, tabla de items, IGV, QR + hash).

import { jsPDF } from 'jspdf';
import type { CompDetalle } from '@/constants/comprobantes/comprobantesConstants';
import { METODO_LABEL } from '@/constants/comprobantes/comprobantesConstants';
import {
  fmtMoney, fmtFechaSolo, numeroALetras,
  generarCodigoHash, buildQrUrl, buildQrData, EMISOR_RUC,
} from './comprobantesUtils';

// ─── Datos del emisor (ajusta aquí si cambian) ────────────────────────────────
const EMISOR_DIRECCION  = 'Lima, Perú'; // ← cambia esto a tu dirección real si quieres que salga exacta
const EMISOR_CONTACTO   = 'www.madrepostres.pe';

const ANCHO_A4  = 210;
const ALTO_A4   = 297;
const MARGEN    = 15;
const ANCHO_UTIL = ANCHO_A4 - MARGEN * 2;

// ── Carga una imagen como dataURL + sus dimensiones reales (para no deformarla) ─
interface ImagenInfo { dataUrl: string; width: number; height: number; }

async function cargarImagenInfo(url: string): Promise<ImagenInfo | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;

    const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const img = new Image();
      img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
    if (!dims || !dims.w || !dims.h) return null;

    return { dataUrl, width: dims.w, height: dims.h };
  } catch {
    return null;
  }
}

/** Calcula el tamaño final (mm) de una imagen para que entre en una caja
 *  máxima sin deformarse (mantiene su proporción real ancho/alto). */
function ajustarDentroDe(info: ImagenInfo, maxW: number, maxH: number): { w: number; h: number } {
  const escala = Math.min(maxW / info.width, maxH / info.height);
  return { w: info.width * escala, h: info.height * escala };
}

const COLOR_TEXTO: [number, number, number] = [40, 40, 40];
const COLOR_MUTED: [number, number, number] = [110, 110, 110];
const COLOR_LINEA: [number, number, number] = [60, 60, 60];

export async function generarPdfComprobante(comp: CompDetalle): Promise<jsPDF> {
  const total     = comp.monto;
  const subtotal  = comp.subtotal ?? total;
  const igv       = comp.igv ?? 0;
  const descuento = comp.descuento_monto ?? 0;
  const fechaEmision = fmtFechaSolo(comp.fecha_emision);
  const baseImponible = total / 1.18;
  const igvCalculado  = total - baseImponible;
  const esNota = comp.tipo === 'nota_venta';
  const recibido = comp.monto_recibido ?? total;
  const saldo    = Math.max(0, total - recibido);

  const headerLabel =
    comp.tipo === 'boleta'     ? 'BOLETA ELECTRÓNICA'    :
    comp.tipo === 'factura'    ? 'FACTURA ELECTRÓNICA'   :
                                  'NOTA DE VENTA';
  const docCliente = comp.tipo === 'factura' ? comp.ruc : comp.dni;
  const labelDoc    = comp.tipo === 'factura' ? 'RUC' : 'DNI';

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_TEXTO);

  let y = MARGEN;

  // ── Encabezado ───────────────────────────────────────────────────────────
  // ✅ FIX: el título "MADRE · Postres y Café" ahora va al lado del logo
  // (no encima ni pegado a él), respetando el ancho real que ocupa el logo
  // para que nunca se solapen, sin importar el tamaño que tenga la imagen.
  // ✅ FIX: se respeta la proporción real de la imagen (antes se forzaba a un
  // cuadrado de 22x22 y se veía achatada).
  const logoInfo  = await cargarImagenInfo('/icons/icono.png').catch(() => null);
  const logoMaxW  = 52;
  const logoMaxH  = 20;
  let altoLogoBloque = 20;

  if (logoInfo) {
    const { w, h } = ajustarDentroDe(logoInfo, logoMaxW, logoMaxH);
    try { doc.addImage(logoInfo.dataUrl, 'PNG', MARGEN, y, w, h); } catch { /* sigue sin logo */ }

    // ✅ El título va en el espacio libre a la derecha del logo (no debajo,
    // no encima) — el logo solo trae un wordmark decorativo pequeño, así que
    // el título grande sigue haciendo falta para que se lea bien.
    const textX = MARGEN + w + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLOR_TEXTO);
    doc.text('MADRE · Postres y Café', textX, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(EMISOR_DIRECCION, textX, y + 11);
    doc.text(EMISOR_CONTACTO,  textX, y + 15.5);

    altoLogoBloque = Math.max(h, 16);
  } else {
    // Si no hay logo, sí mostramos el nombre como texto (no hay redundancia)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('MADRE · Postres y Café', MARGEN, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(EMISOR_DIRECCION, MARGEN, y + 11);
    doc.text(EMISOR_CONTACTO,  MARGEN, y + 15.5);
    altoLogoBloque = 16;
  }

  // Recuadro de RUC + tipo de documento (estilo SUNAT)
  const cajaAncho  = 58;
  const cajaAlto   = 20;
  const cajaX      = ANCHO_A4 - MARGEN - cajaAncho;

  doc.setDrawColor(...COLOR_LINEA);
  doc.setLineWidth(0.4);
  doc.roundedRect(cajaX, y, cajaAncho, cajaAlto, 1, 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_TEXTO);
  doc.text(`RUC ${EMISOR_RUC}`, cajaX + cajaAncho / 2, y + 6, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(headerLabel, cajaX + cajaAncho / 2, y + 12, { align: 'center' });
  doc.setFontSize(10.5);
  doc.text(comp.numero, cajaX + cajaAncho / 2, y + 17.5, { align: 'center' });

  y += Math.max(altoLogoBloque, cajaAlto) + 6;

  if (comp.estado === 'anulado') {
    doc.setTextColor(204, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('*** COMPROBANTE ANULADO ***', ANCHO_A4 / 2, y, { align: 'center' });
    doc.setTextColor(...COLOR_TEXTO);
    y += 7;
  }

  doc.setDrawColor(...COLOR_LINEA);
  doc.setLineWidth(0.3);
  doc.line(MARGEN, y, ANCHO_A4 - MARGEN, y);
  y += 6;

  // ── Datos del cliente / fechas ───────────────────────────────────────────
  // ✅ FIX: más espacio entre etiqueta y valor para que no se encimen
  // (antes "Fecha de vencimiento:" y "Condición de pago:" no alcanzaban).
  doc.setFontSize(9);
  const colDerechaX  = ANCHO_A4 / 2 + 8;
  const valorIzqX    = MARGEN + 40;       // antes: MARGEN + 24
  const valorDerX    = colDerechaX + 46;  // antes: colDerechaX + 32

  const filaIzq = (label: string, valor: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, MARGEN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(valor, valorIzqX, y, { maxWidth: colDerechaX - valorIzqX - 5 });
  };
  const filaDer = (label: string, valor: string, yLocal: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${label}:`, colDerechaX, yLocal);
    doc.setFont('helvetica', 'normal');
    doc.text(valor, valorDerX, yLocal, { maxWidth: ANCHO_A4 - MARGEN - valorDerX });
    doc.setFontSize(9);
  };

  filaIzq('Cliente', comp.cliente_nombre ?? 'Cliente General');
  filaDer('Fecha de emisión', fechaEmision, y);
  y += 6;
  if (docCliente) {
    filaIzq(labelDoc, docCliente);
    filaDer('Fecha de vencimiento', fechaEmision, y);
    y += 6;
  }
  filaIzq('Atendido por', comp.usuario_nombre);
  y += 6;
  filaIzq('Condición de pago', 'Contado');
  y += 9;

  // ── Tabla de items ───────────────────────────────────────────────────────
  const colCant   = MARGEN;
  const colDesc   = MARGEN + 14;
  const colPUnit  = ANCHO_A4 - MARGEN - 40;
  const colTotal  = ANCHO_A4 - MARGEN;

  doc.setFillColor(240, 240, 240);
  doc.rect(MARGEN, y - 4.5, ANCHO_UTIL, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CANT.', colCant, y);
  doc.text('DESCRIPCIÓN', colDesc, y);
  doc.text('P. UNIT.', colPUnit, y, { align: 'right' });
  doc.text('TOTAL', colTotal, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  if (comp.items && comp.items.length > 0) {
    for (const item of comp.items) {
      const nombre = (item.producto?.nombre ?? 'Producto').trim();
      doc.text(String(item.cantidad), colCant, y);
      doc.text(nombre, colDesc, y, { maxWidth: colPUnit - colDesc - 6 });
      doc.text(fmtMoney(item.precio_unitario), colPUnit, y, { align: 'right' });
      doc.text(fmtMoney(item.subtotal), colTotal, y, { align: 'right' });
      y += 6;
    }
  } else {
    doc.setTextColor(...COLOR_MUTED);
    doc.text('— sin productos registrados —', ANCHO_A4 / 2, y, { align: 'center' });
    doc.setTextColor(...COLOR_TEXTO);
    y += 6;
  }

  doc.setDrawColor(...COLOR_LINEA);
  doc.line(MARGEN, y, ANCHO_A4 - MARGEN, y);
  y += 7;

  // ── Totales (alineados a la derecha, como en una factura formal) ─────────
  const labelX = colTotal - 38;
  doc.setFontSize(9);

  const filaTotal = (label: string, valor: string, negrita = false) => {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal');
    doc.text(label, labelX, y, { align: 'right' });
    doc.text(valor, colTotal, y, { align: 'right' });
    y += 5.5;
  };

  if (descuento > 0) {
    filaTotal('Subtotal bruto:', fmtMoney(subtotal + descuento));
    filaTotal('Descuento:', `- ${fmtMoney(descuento)}`);
  }

  if (esNota) {
    filaTotal('Subtotal:', fmtMoney(subtotal));
  } else if (comp.tipo === 'factura') {
    filaTotal('OP. GRAVADAS: S/', fmtMoney(baseImponible).replace('S/ ', ''));
    filaTotal('IGV (18%): S/', fmtMoney(igvCalculado).replace('S/ ', ''));
  } else {
    filaTotal('OP. GRAVADAS: S/', fmtMoney(subtotal).replace('S/ ', ''));
    filaTotal('IGV: S/', fmtMoney(igv).replace('S/ ', ''));
  }

  doc.setDrawColor(...COLOR_LINEA);
  doc.line(labelX - 25, y, colTotal, y);
  y += 5.5;
  doc.setFontSize(10.5);
  filaTotal('TOTAL A PAGAR: S/', fmtMoney(total).replace('S/ ', ''), true);

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SON:', MARGEN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(numeroALetras(total).replace('SON: ', ''), MARGEN + 11, y, { maxWidth: ANCHO_UTIL - 11 });
  y += esNota ? 8 : 10;

  if (esNota) {
    doc.setFont('helvetica', 'bold');
    doc.text('Pagos:', MARGEN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${fechaEmision} - ${METODO_LABEL[comp.metodo_pago] ?? comp.metodo_pago} - ${fmtMoney(recibido)}`, MARGEN + 16, y);
    y += 6;
    if (saldo > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(`SALDO: ${fmtMoney(saldo)}`, MARGEN, y);
      y += 6;
    }
  } else {
    // ── QR + hash + condición de pago ───────────────────────────────────────
    const qrSize = 26;
    const qrUrl = buildQrUrl(buildQrData(comp), 220);
    const qrInfo = await cargarImagenInfo(qrUrl).catch(() => null);
    if (qrInfo) {
      try { doc.addImage(qrInfo.dataUrl, 'PNG', MARGEN, y, qrSize, qrSize); } catch { /* ignore */ }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Código Hash:', MARGEN + qrSize + 4, y + 5);
    doc.setFontSize(7.5);
    doc.text(generarCodigoHash(comp.id), MARGEN + qrSize + 4, y + 9.5, { maxWidth: ANCHO_UTIL - qrSize - 4 });

    doc.setFontSize(8.5);
    doc.text(`Método de pago: ${METODO_LABEL[comp.metodo_pago] ?? comp.metodo_pago} - ${fmtMoney(recibido)}`, MARGEN + qrSize + 4, y + 16);

    y += qrSize + 6;
  }

  if (comp.notas) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Nota:', MARGEN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(comp.notas, MARGEN + 11, y, { maxWidth: ANCHO_UTIL - 11 });
    y += 7;
  }

  // ── Footer legal ──────────────────────────────────────────────────────────
  const footerY = ALTO_A4 - MARGEN - 4;
  doc.setDrawColor(...COLOR_LINEA);
  doc.line(MARGEN, footerY - 6, ANCHO_A4 - MARGEN, footerY - 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  const footerLegal =
    comp.tipo === 'boleta'     ? 'Esta es una representación impresa de la Boleta de Venta Electrónica.' :
    comp.tipo === 'factura'    ? 'Esta es una representación impresa de la Factura Electrónica.' :
                                  'Este documento es una Nota de Venta, sin valor tributario.';
  doc.text(footerLegal, ANCHO_A4 / 2, footerY - 1, { align: 'center' });
  doc.text(EMISOR_CONTACTO, ANCHO_A4 / 2, footerY + 3.5, { align: 'center' });

  return doc;
}

/** Genera y descarga directamente el PDF del comprobante. */
export async function descargarPdfComprobante(comp: CompDetalle): Promise<void> {
  const doc = await generarPdfComprobante(comp);
  doc.save(`${comp.numero}.pdf`);
}