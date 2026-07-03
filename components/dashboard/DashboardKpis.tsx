// components/dashboard/DashboardKpis.tsx
import React from 'react';
import { DollarSign, ShoppingBag, Users, Package } from 'lucide-react';
import { B } from '@/lib/brand';
import { KpiCard } from '@/components/ui';

interface DashboardKpisProps {
  totalVentas:        number;
  transacciones:      number;
  ticketPromedio:     number;
  productosVendidos:  number;
  insumosAlerta:      number;
}

export function DashboardKpis({
  totalVentas,
  transacciones,
  ticketPromedio,
  productosVendidos,
  insumosAlerta,
}: DashboardKpisProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5">
      <KpiCard
        label="Ventas Hoy"
        value={`S/ ${totalVentas.toFixed(2)}`}
        sub={`Ticket prom. S/ ${ticketPromedio.toFixed(2)}`}
        icon={DollarSign}
        color={B.green}
      />
      <KpiCard
        label="Transacciones"
        value={transacciones}
        sub="ventas completadas"
        icon={Users}
        color={B.gold}
      />
      <KpiCard
        label="Productos Vendidos"
        value={productosVendidos}
        sub="unidades hoy"
        icon={ShoppingBag}
        color={B.terra}
      />
      <KpiCard
        label="Insumos con Alerta"
        value={insumosAlerta}
        sub="Stock bajo en cocina"
        icon={Package}
        color={B.charcoal}
      />
    </div>
  );
}