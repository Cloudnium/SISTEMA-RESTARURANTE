// components/dashboard/DashboardVentasRecientes.tsx
'use client';

import React, { useState } from 'react';
import { Receipt } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card } from '@/components/ui';
import type { Venta } from '@/lib/supabase/types';
import { VentaDetalleModal } from './VentaDetalleModal';

// ─── Tipo extendido ───────────────────────────────────────────────────────────

type VentaConComprobante = Venta & {
  comprobante?: {
    numero?:      string | null;
    tipo?:        string | null;
    serie?:       string | null;
    correlativo?: number | null;
  } | null;
  comprobante_numero?: string | null;
  hora_local?:         string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(venta: { created_at: string; fecha_local: string; hora_local?: string | null }): string {
  const [anio, mes, dia] = venta.fecha_local.split('-');

  if (venta.hora_local) {
    const [h, m] = venta.hora_local.split(':').map(Number);
    const ampm = h >= 12 ? 'p. m.' : 'a. m.';
    const h12  = h % 12 || 12;
    const hStr = String(h12).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    return `${dia}/${mes}/${anio.slice(2)}, ${hStr}:${mStr} ${ampm}`;
  }

  const horaLima = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit',
  }).format(new Date(venta.created_at));
  return `${dia}/${mes}/${anio.slice(2)}, ${horaLima}`;
}

function resolveNombreVenta(venta: VentaConComprobante): string {
  const c = venta.comprobante;
  if (c?.numero) return c.numero;
  if (c?.serie && c?.correlativo != null)
    return `${c.serie}-${String(c.correlativo).padStart(8, '0')}`;
  if (venta.comprobante_numero) return venta.comprobante_numero;
  return `Venta ${venta.id.slice(0, 8)}`;
}

function labelComprobante(tipo: Venta['tipo_comprobante']): string {
  switch (tipo) {
    case 'boleta':     return 'Boleta';
    case 'factura':    return 'Factura';
    case 'nota_venta': return 'Nota de Venta';
    default:           return tipo;
  }
}

function pillStyle(tipo: Venta['tipo_comprobante']): React.CSSProperties {
  if (tipo === 'boleta')  return { background: '#e8f5e2', color: B.green };
  if (tipo === 'factura') return { background: '#fdf8e6', color: B.gold };
  return { background: `${B.charcoal}12`, color: B.charcoal };
}

function abrevTipo(tipo: Venta['tipo_comprobante']): string {
  return tipo === 'nota_venta' ? 'NV' : tipo === 'boleta' ? 'B' : 'F';
}

// ─── Fila ─────────────────────────────────────────────────────────────────────

function VentaRow({
  venta,
  onClick,
}: {
  venta:   VentaConComprobante;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex items-center justify-between py-3 border-b last:border-0 gap-3 rounded-lg px-2 -mx-2 transition-colors"
      style={{
        borderColor:     B.cream,
        background:      hovered ? `${B.green}08` : 'transparent',
        cursor:          'pointer',
      }}
    >
      {/* Ícono + comprobante + fecha */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          style={{
            background: hovered ? `${B.green}18` : `${B.charcoal}12`,
          }}
        >
          <Receipt
            className="w-4 h-4 transition-colors"
            style={{ color: hovered ? B.green : B.charcoal }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: B.charcoal }}>
            {resolveNombreVenta(venta)}
          </p>
          <p className="text-xs" style={{ color: B.muted }}>
            {formatFecha(venta)}
          </p>
        </div>
      </div>

      {/* Pill tipo + total */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Tablet/desktop: texto completo */}
        <span
          className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
          style={pillStyle(venta.tipo_comprobante)}
        >
          {labelComprobante(venta.tipo_comprobante)}
        </span>
        {/* Móvil: abreviación */}
        <span
          className="sm:hidden text-xs px-1.5 py-0.5 rounded font-semibold"
          style={pillStyle(venta.tipo_comprobante)}
        >
          {abrevTipo(venta.tipo_comprobante)}
        </span>
        <p className="text-sm font-bold whitespace-nowrap" style={{ color: B.charcoal }}>
          S/ {venta.total.toFixed(2)}
        </p>
      </div>
    </button>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function DashboardVentasRecientes({
  ventas,
}: {
  ventas: VentaConComprobante[];
}) {
  const [ventaSeleccionadaId, setVentaSeleccionadaId] = useState<string | null>(null);

  return (
    <>
      <Card>
        <p className="text-sm font-bold mb-4" style={{ color: B.charcoal }}>
          Ventas Recientes
        </p>
        {ventas.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: B.muted }}>
            No hay ventas recientes
          </p>
        ) : (
          ventas.map(v => (
            <VentaRow
              key={v.id}
              venta={v}
              onClick={() => setVentaSeleccionadaId(v.id)}
            />
          ))
        )}
      </Card>

      {/* Modal de detalle */}
      <VentaDetalleModal
        ventaId={ventaSeleccionadaId}
        onClose={() => setVentaSeleccionadaId(null)}
      />
    </>
  );
}