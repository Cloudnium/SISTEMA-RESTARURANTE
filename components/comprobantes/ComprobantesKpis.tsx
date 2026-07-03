// components/comprobantes/ComprobantesKpis.tsx
'use client';

import React, { useMemo } from 'react';
import { DollarSign, Receipt, FileText } from 'lucide-react';
import { B } from '@/lib/brand';
import { KpiCard } from '@/components/ui';
import type { CompDetalle } from '@/constants/comprobantes/comprobantesConstants';

interface Props {
  lista: CompDetalle[];
}

export function ComprobantesKpis({ lista }: Props) {
  const hoyLima = useMemo(
    () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }),
    [],
  );

  const esHoy = (comp: CompDetalle): boolean => {
    if (comp.venta_fecha_local) return comp.venta_fecha_local === hoyLima;
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' })
      .format(new Date(comp.fecha_emision)) === hoyLima;
  };

  const emitidosHoy = useMemo(
    () => lista.filter(c => c.estado === 'emitido' && esHoy(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lista, hoyLima],
  );

  const totalHoy   = useMemo(() => emitidosHoy.reduce((s, c) => s + c.monto, 0), [emitidosHoy]);
  const boletasHoy = useMemo(() => emitidosHoy.filter(c => c.tipo === 'boleta').length,     [emitidosHoy]);
  const notasHoy   = useMemo(() => emitidosHoy.filter(c => c.tipo === 'nota_venta').length, [emitidosHoy]);
  const factTotal  = useMemo(() => lista.filter(c => c.tipo === 'factura').length,          [lista]);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5">
      <KpiCard
        label="Total Emitido Hoy"
        value={`S/ ${totalHoy.toFixed(2)}`}
        icon={DollarSign}
        color={B.green}
      />
      <KpiCard
        label="Boletas Hoy"
        value={boletasHoy}
        sub={`Total: ${lista.filter(c => c.tipo === 'boleta').length}`}
        icon={Receipt}
        color={B.terra}
      />
      <KpiCard
        label="Notas de Venta"
        value={notasHoy}
        sub={`Total: ${lista.filter(c => c.tipo === 'nota_venta').length}`}
        icon={FileText}
        color={B.gold}
      />
      <KpiCard
        label="Facturas"
        value={factTotal}
        icon={FileText}
        color={B.charcoal}
      />
    </div>
  );
}