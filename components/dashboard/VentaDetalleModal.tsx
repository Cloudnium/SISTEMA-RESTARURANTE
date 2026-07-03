// components/dashboard/VentaDetalleModal.tsx
'use client';

import React, {
  useCallback, useEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import { X, ShoppingBag, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { supabase } from '@/lib/supabase/client';
import type { TipoComprobante } from '@/lib/supabase/types';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ComprobanteResumen {
  numero:      string | null;
  serie:       string | null;
  correlativo: number | null;
  tipo:        TipoComprobante | null;
  estado:      string | null;
}

interface ItemDetalle {
  id:              string;
  cantidad:        number;
  precio_unitario: number;
  subtotal:        number;
  producto: {
    id:        string;
    nombre:    string;
    categoria: string;
  } | null;
}

interface VentaDetalle {
  id:               string;
  tipo_comprobante: TipoComprobante;
  metodo_pago:      string;
  subtotal:         number;
  igv:              number;
  total:            number;
  descuento_monto:  number | null;
  notas:            string | null;
  fecha_local:      string;
  hora_local:       string | null;
  created_at:       string;
  comprobante:      ComprobanteResumen | null;
  items_detalle:    ItemDetalle[];
}

interface VentaDetalleModalProps {
  ventaId: string | null;
  onClose: () => void;
}

// ─── Cache en memoria ─────────────────────────────────────────────────────────

const cache = new Map<string, VentaDetalle>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveNumeroComprobante(venta: VentaDetalle): string {
  const c = venta.comprobante;
  if (c?.numero) return c.numero;
  if (c?.serie && c?.correlativo != null)
    return `${c.serie}-${String(c.correlativo).padStart(8, '0')}`;
  return `Venta ${venta.id.slice(0, 8).toUpperCase()}`;
}

function formatFechaModal(venta: VentaDetalle): string {
  const [anio, , dia] = venta.fecha_local.split('-');
  if (venta.hora_local) {
    const [h, m] = venta.hora_local.split(':').map(Number);
    const ampm = h >= 12 ? 'p. m.' : 'a. m.';
    const h12  = h % 12 || 12;
    return `${dia} jun. ${anio} • ${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  const horaLima = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit',
  }).format(new Date(venta.created_at));
  return `${dia} jun. ${anio} • ${horaLima}`;
}

function labelTipo(tipo: TipoComprobante): string {
  if (tipo === 'boleta')     return 'Boleta';
  if (tipo === 'factura')    return 'Factura';
  if (tipo === 'nota_venta') return 'Nota de Venta';
  return tipo;
}

function pillColors(tipo: TipoComprobante): React.CSSProperties {
  if (tipo === 'boleta')  return { background: '#e8f5e2', color: B.green, border: `1px solid ${B.green}40` };
  if (tipo === 'factura') return { background: '#fdf8e6', color: B.gold,  border: `1px solid ${B.gold}40`  };
  return { background: `${B.terra}14`, color: B.terra, border: `1px solid ${B.terra}40` };
}

// ─── Fetch de detalle (con cache) ─────────────────────────────────────────────

async function fetchVentaDetalle(ventaId: string): Promise<VentaDetalle> {
  if (cache.has(ventaId)) return cache.get(ventaId)!;

  const [ventaRes, itemsRes, compRes] = await Promise.all([
    supabase
      .from('ventas')
      .select('id, tipo_comprobante, metodo_pago, subtotal, igv, total, descuento_monto, notas, fecha_local, hora_local, created_at')
      .eq('id', ventaId)
      .single(),
    supabase
      .from('venta_items')
      .select('id, cantidad, precio_unitario, subtotal, producto:productos(id, nombre, categoria)')
      .eq('venta_id', ventaId)
      .order('id'),
    supabase
      .from('comprobantes')
      .select('numero, serie, correlativo, tipo, estado')
      .eq('venta_id', ventaId)
      .maybeSingle(),
  ]);

  if (ventaRes.error) throw ventaRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const result: VentaDetalle = {
    ...(ventaRes.data as Omit<VentaDetalle, 'comprobante' | 'items_detalle'>),
    comprobante:   (compRes.data as ComprobanteResumen | null) ?? null,
    items_detalle: (itemsRes.data ?? []) as ItemDetalle[],
  };

  cache.set(ventaId, result);
  return result;
}

// ─── Reducer para el estado del fetch ────────────────────────────────────────
// Agrupa loading + error + venta en un solo objeto para que el useEffect
// solo necesite llamar dispatch() una vez — satisface el linter estricto que
// prohíbe setState() directamente en el cuerpo de un effect.

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok';    venta: VentaDetalle }
  | { status: 'error'; message: string };

type FetchAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_OK';    venta: VentaDetalle }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'RESET' };

function fetchReducer(_state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'FETCH_START': return { status: 'loading' };
    case 'FETCH_OK':    return { status: 'ok', venta: action.venta };
    case 'FETCH_ERROR': return { status: 'error', message: action.message };
    case 'RESET':       return { status: 'idle' };
    default:            return _state;
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

const ITEMS_PREVIEW = 2;

export function VentaDetalleModal({ ventaId, onClose }: VentaDetalleModalProps) {
  // verTodos se inicializa desde ventaId directamente — sin effect, sin setState.
  // Cada vez que ventaId cambia el componente re-monta la key (ver más abajo),
  // lo que resetea todo el estado local sin necesidad de effects para ello.
  const [verTodos, setVerTodos] = useState(false);
  const [fetchState, dispatch]  = useReducer(fetchReducer, { status: 'idle' });
  const overlayRef              = useRef<HTMLDivElement>(null);

  // La venta a mostrar: primero cache, luego el resultado del fetch.
  const ventaCacheada = cache.get(ventaId ?? '') ?? null;
  const venta = ventaCacheada
    ?? (fetchState.status === 'ok' ? fetchState.venta : null);

  const loading = fetchState.status === 'loading';
  const error   = fetchState.status === 'error' ? fetchState.message : null;

  // ── Fetch cuando no está en cache ────────────────────────────────────────
  // El effect SOLO llama dispatch() — nunca setState() directamente.
  // dispatch() es estable (no cambia entre renders) y satisface el linter.
  useEffect(() => {
    if (!ventaId || ventaCacheada) return;

    let cancelled = false;

    dispatch({ type: 'FETCH_START' });

    fetchVentaDetalle(ventaId).then(data => {
      if (!cancelled) dispatch({ type: 'FETCH_OK', venta: data });
    }).catch((e: Error) => {
      if (!cancelled) dispatch({ type: 'FETCH_ERROR', message: e?.message ?? 'Error al cargar la venta' });
    });

    return () => { cancelled = true; };
  }, [ventaId, ventaCacheada]);

  // ── Cerrar con Escape ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ventaId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [ventaId, onClose]);

  // ── Bloquear scroll del body ──────────────────────────────────────────────
  useEffect(() => {
    if (!ventaId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [ventaId]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const items = useMemo(() => venta?.items_detalle ?? [], [venta]);

  const itemsVisibles = useMemo(
    () => (verTodos ? items : items.slice(0, ITEMS_PREVIEW)),
    [items, verTodos],
  );

  const itemsOcultos = items.length - ITEMS_PREVIEW;
  const tieneOcultos = !verTodos && itemsOcultos > 0;

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose],
  );

  if (!ventaId) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={handleOverlayClick}
    >
      {/* Panel — key=ventaId hace que React re-monte el panel cuando cambia la
          venta seleccionada, reseteando verTodos y fetchState sin ningún effect */}
      <div
        key={ventaId}
        className="relative w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          maxWidth:   480,
          maxHeight:  '90vh',
          background: '#FDFAF4',
          border:     `1px solid ${B.cream}`,
        }}
      >
        {/* ── Encabezado ── */}
        <div
          className="flex items-start justify-between px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: `1px solid ${B.cream}` }}
        >
          <div className="flex flex-col gap-1.5 min-w-0 flex-1 pr-3">
            {venta && (
              <span
                className="self-start text-xs font-semibold px-2.5 py-1 rounded-full"
                style={pillColors(venta.tipo_comprobante)}
              >
                {labelTipo(venta.tipo_comprobante)}
              </span>
            )}
            <h2
              className="text-xl font-bold tracking-tight mt-0.5 truncate"
              style={{ color: B.charcoal }}
            >
              {venta ? resolveNumeroComprobante(venta) : '—'}
            </h2>
            {venta && (
              <p className="text-sm flex items-center gap-1.5" style={{ color: B.muted }}>
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: B.muted }}
                />
                {formatFechaModal(venta)}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${B.charcoal}12`, color: B.charcoal }}
            onMouseEnter={e => (e.currentTarget.style.background = `${B.charcoal}22`)}
            onMouseLeave={e => (e.currentTarget.style.background = `${B.charcoal}12`)}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Cuerpo scrollable ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: B.green }} />
            </div>
          )}

          {error && !loading && (
            <div
              className="rounded-xl px-4 py-3 text-sm text-center"
              style={{ background: `${B.terra}12`, color: B.terra }}
            >
              {error}
            </div>
          )}

          {venta && !loading && (
            <>
              {/* Total */}
              <div
                className="rounded-xl px-5 py-4"
                style={{ background: `${B.green}12`, border: `1px solid ${B.green}20` }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-1"
                  style={{ color: B.green }}
                >
                  Total
                </p>
                <p className="text-3xl font-bold" style={{ color: B.green }}>
                  S/ {venta.total.toFixed(2)}
                </p>
              </div>

              {/* Desglose fiscal — una sola fila, cada celda ocupa el mismo espacio */}
              <div
                className="rounded-xl px-4 py-3 flex items-start text-xs"
                style={{ background: `${B.charcoal}06`, border: `1px solid ${B.cream}` }}
              >
                {/* Subtotal */}
                <div className="flex-1 min-w-0">
                  <p style={{ color: B.muted }}>Subtotal (sin IGV)</p>
                  <p className="font-semibold mt-0.5 truncate" style={{ color: B.charcoal }}>
                    S/ {venta.subtotal.toFixed(2)}
                  </p>
                </div>

                {/* Separador */}
                <div className="w-px self-stretch mx-3 shrink-0" style={{ background: `${B.charcoal}15` }} />

                {/* IGV */}
                <div className="flex-1 min-w-0">
                  <p style={{ color: B.muted }}>IGV (18%)</p>
                  <p className="font-semibold mt-0.5 truncate" style={{ color: B.charcoal }}>
                    S/ {venta.igv.toFixed(2)}
                  </p>
                </div>

                {/* Descuento (opcional) */}
                {venta.descuento_monto != null && venta.descuento_monto > 0 && (
                  <>
                    <div className="w-px self-stretch mx-3 shrink-0" style={{ background: `${B.charcoal}15` }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ color: B.muted }}>Descuento</p>
                      <p className="font-semibold mt-0.5 truncate" style={{ color: B.terra }}>
                        − S/ {venta.descuento_monto.toFixed(2)}
                      </p>
                    </div>
                  </>
                )}

                {/* Método de pago */}
                {venta.metodo_pago && (
                  <>
                    <div className="w-px self-stretch mx-3 shrink-0" style={{ background: `${B.charcoal}15` }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ color: B.muted }}>Método de pago</p>
                      <p className="font-semibold mt-0.5 capitalize truncate" style={{ color: B.charcoal }}>
                        {venta.metodo_pago}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Productos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" style={{ color: B.charcoal }} />
                    <span className="text-sm font-semibold" style={{ color: B.charcoal }}>
                      Productos ({items.length})
                    </span>
                  </div>
                  {items.length > ITEMS_PREVIEW && (
                    <button
                      onClick={() => setVerTodos(v => !v)}
                      className="flex items-center gap-1 text-xs font-semibold"
                      style={{ color: B.green }}
                    >
                      {verTodos ? 'Ver menos' : 'Ver todos'}
                      {verTodos
                        ? <ChevronUp   className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />
                      }
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {itemsVisibles.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                      style={{ background: B.white, border: `1px solid ${B.cream}` }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{ color: B.charcoal }}>
                          {item.producto?.nombre ?? 'Producto eliminado'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs" style={{ color: B.muted }}>
                            {item.cantidad} unidad{item.cantidad !== 1 ? 'es' : ''}
                          </span>
                          <span className="text-xs" style={{ color: `${B.charcoal}40` }}>×</span>
                          <span className="text-xs" style={{ color: B.muted }}>
                            S/ {item.precio_unitario.toFixed(2)}
                          </span>
                          {item.producto?.categoria && (
                            <>
                              <span className="text-xs" style={{ color: `${B.charcoal}30` }}>·</span>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{ background: `${B.green}14`, color: B.green }}
                              >
                                {item.producto.categoria}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-bold shrink-0" style={{ color: B.charcoal }}>
                        S/ {(item.precio_unitario * item.cantidad).toFixed(2)}
                      </p>
                    </div>
                  ))}

                  {tieneOcultos && (
                    <button
                      onClick={() => setVerTodos(true)}
                      className="text-xs text-center py-2 w-full rounded-lg"
                      style={{ color: B.green, background: `${B.green}08` }}
                    >
                      + {itemsOcultos} producto{itemsOcultos !== 1 ? 's' : ''} más
                    </button>
                  )}
                </div>
              </div>

              {/* Notas */}
              {venta.notas && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: `${B.gold}10`, border: `1px solid ${B.gold}25`, color: B.charcoal }}
                >
                  <span
                    className="font-semibold text-xs uppercase tracking-widest block mb-1"
                    style={{ color: B.gold }}
                  >
                    Nota
                  </span>
                  {venta.notas}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${B.cream}` }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-sm active:opacity-80"
            style={{ background: B.charcoal, color: '#FDFAF4' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}