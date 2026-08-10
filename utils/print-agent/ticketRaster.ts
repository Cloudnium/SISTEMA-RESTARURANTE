// utils/print-agent/ticketRaster.ts
//
// Por qué existe este archivo:
// Reconstruir el ticket con comandos de texto ESC/POS (como hacía antes
// `construirTicketComprobante` en printAgentClient.ts) NUNCA puede quedar
// 100% idéntico al diseño real — fuente monoespaciada distinta, sin
// subrayados, sin el logo con el mismo tamaño/recorte, espaciados
// aproximados a mano, etc. Sin importar cuánto se ajuste, siempre queda
// "parecido" y no "igual".
//
// La única forma de que el ticket impreso sea IGUAL al diseño guardado en
// Comprobantes es no reconstruirlo: se renderiza el mismo HTML que ya usa
// `buildPrintHTML()` (el que se ve en pantalla y se descarga), se convierte
// ese render a una imagen (con html2canvas), y se manda esa imagen a la
// impresora como un bitmap (el agente ya sabe hacer esto — así imprime hoy
// el logo — vía GS v 0 / imageToRaster.js). El resultado es un calco
// pixel a pixel de lo que se ve en pantalla, letra por letra.

import html2canvas from 'html2canvas';
import { buildPrintHTML } from '@/utils/comprobantes/comprobantesUtils';
import type { CompDetalle } from '@/constants/comprobantes/comprobantesConstants';

// Debe coincidir con el ancho de imagen que usa el agente para tu impresora
// (imgWidthDots en el target — ver printerService.js). 576 = ancho estándar
// de una impresora térmica de 80mm a 203dpi (antes estaba en 384, que es el
// de una de 58mm — por eso el ticket salía angosto/chico dentro del papel).
const RASTER_WIDTH = 576;

function esperarFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/** Convierte una URL de imagen a data-URI base64, para que quede embebida en
 *  el HTML sin depender de una carga de red externa al momento de imprimir
 *  (y sin ensuciar el canvas por CORS: un <img> cross-origin sin cabeceras
 *  CORS permisivas deja el canvas "tainted" y toDataURL() truena). */
async function imagenAdataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Reemplaza el primer <img src="URL_ORIGINAL" ...> del html por
 *  <img src="DATA_URI" ...>, dejando el resto del atributo intacto. */
function incrustarImagen(html: string, urlOriginal: string, dataUri: string | null): string {
  if (!dataUri) return html;
  return html.replace(urlOriginal, dataUri);
}

/** Prepara el iframe oculto con el HTML del comprobante ya listo para
 *  capturar (imágenes incrustadas, cargado, altura medida y ajustada al
 *  contenido real — nada de alturas fijas "de sobra", que es justo lo que
 *  generaba tickets con metros de papel en blanco). Devuelve el iframe ya
 *  con el tamaño correcto; quien lo use debe removerlo del DOM al terminar. */
async function prepararIframeTicket(comp: CompDetalle): Promise<HTMLIFrameElement> {
  let html = buildPrintHTML(comp);

  // El logo es local (mismo origen, /icons/icono.png) — no da problema de
  // CORS, pero igual lo incrustamos como data-URI para no depender de que
  // el iframe termine de pedirlo por red antes de capturar.
  const logoDataUri = await imagenAdataUri('/icons/icono.png').catch(() => null);
  if (logoDataUri) html = incrustarImagen(html, '/icons/icono.png', logoDataUri);

  // El QR SÍ es de otro dominio (api.qrserver.com) — este es el que de
  // verdad puede tintar el canvas si no se incrusta primero.
  const qrMatch = html.match(/https:\/\/api\.qrserver\.com[^"']+/);
  if (qrMatch) {
    const qrDataUri = await imagenAdataUri(qrMatch[0]).catch(() => null);
    if (qrDataUri) html = incrustarImagen(html, qrMatch[0], qrDataUri);
  }

  // Forzamos el ancho del ticket al ancho de raster de la impresora (en vez
  // de los 80mm pensados para hoja/CSS de pantalla), para que el bitmap
  // resultante ya salga con las proporciones correctas sin tener que
  // reescalar de forma rara después.
  html = html.replace('width:80mm', `width:${RASTER_WIDTH}px`);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-99999px';
  iframe.style.top = '0';
  iframe.style.width = `${RASTER_WIDTH}px`;
  // Arranca chico a propósito: se ajusta al contenido REAL más abajo. Antes
  // esto estaba fijo en 2400px "de sobra", y html2canvas capturaba ESOS
  // 2400px completos aunque el ticket real midiera una fracción de eso —
  // de ahí los ~17cm de papel en blanco después del contenido.
  iframe.style.height = '10px';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Tiempo de espera agotado al renderizar el ticket')), 8000);
    iframe.onload = () => { clearTimeout(timeout); resolve(); };
    iframe.onerror = () => { clearTimeout(timeout); reject(new Error('No se pudo cargar el ticket para imprimir')); };
    iframe.srcdoc = html;
  });

  const doc = iframe.contentDocument;
  const body = doc?.body;
  if (!doc || !body) throw new Error('No se pudo acceder al contenido del ticket a imprimir');

  // Ya incrustamos logo y QR como data-URI, pero por si quedara alguna otra
  // imagen sin cargar, esperamos a que terminen antes de medir/capturar.
  const imgs = Array.from(doc.images);
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          }),
    ),
  );
  // Esperar también a que la fuente termine de cargar/aplicarse (si no, se
  // puede medir la altura ANTES de que el texto asiente en su tipografía
  // final, dando una altura un poco corta y cortando el pie del ticket).
  await doc.fonts?.ready?.catch(() => {});

  // Medir la altura REAL del contenido ya renderizado y ajustar el iframe
  // exacto a eso — esto es lo que evita el papel en blanco de más.
  await esperarFrame();
  const alturaReal = Math.ceil(Math.max(body.scrollHeight, doc.documentElement.scrollHeight));
  iframe.style.height = `${alturaReal}px`;
  await esperarFrame(); // dejar que el nuevo alto del iframe se aplique antes de capturar

  return iframe;
}

/**
 * Renderiza el comprobante EXACTAMENTE como lo dibuja `buildPrintHTML()`
 * (el mismo HTML que se ve/descarga en Comprobantes) y lo convierte a una
 * imagen PNG en base64 (sin el prefijo "data:image/png;base64,"), lista
 * para mandarse como bitmap al agente de impresión.
 */
export async function renderComprobanteAImagen(comp: CompDetalle): Promise<string> {
  const iframe = await prepararIframeTicket(comp);
  try {
    const body = iframe.contentDocument!.body;
    const alturaReal = body.scrollHeight;

    const canvas = await html2canvas(body, {
      width: RASTER_WIDTH,
      height: alturaReal,
      windowWidth: RASTER_WIDTH,
      windowHeight: alturaReal,
      scale: 2, // supersample: más nítido antes de que el agente lo pase a 1bpp
      backgroundColor: '#ffffff',
      useCORS: true,
    });

    return canvas.toDataURL('image/png').split(',')[1];
  } finally {
    document.body.removeChild(iframe);
  }
}

/**
 * Vista previa SIN imprimir: genera la misma imagen que se mandaría a la
 * impresora y la abre en una pestaña nueva, para poder revisarla antes de
 * gastar papel real. Útil mientras se prueban cambios de diseño.
 */
export async function previsualizarTicketRaster(comp: CompDetalle): Promise<void> {
  const base64 = await renderComprobanteAImagen(comp);
  window.open(`data:image/png;base64,${base64}`, '_blank');
}
