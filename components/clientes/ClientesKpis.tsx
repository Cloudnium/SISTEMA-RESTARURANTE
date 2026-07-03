// components/clientes/ClientesKpis.tsx
'use client';

import { useMemo } from 'react';
import { Users, UserCircle, Building2, TrendingUp } from 'lucide-react';
import { B } from '@/lib/brand';
import { KpiCard } from '@/components/ui';
import type { Cliente } from '@/lib/supabase/types';

interface ClientesKpisProps {
  clientes: Cliente[];
}

export function ClientesKpis({ clientes }: ClientesKpisProps) {
  const { total, personas, empresas, conPuntos } = useMemo(() => ({
    total:     clientes.length,
    personas:  clientes.filter(c => c.tipo === 'persona').length,
    empresas:  clientes.filter(c => c.tipo === 'empresa').length,
    conPuntos: clientes.filter(c => c.puntos_acumulados > 0).length,
  }), [clientes]);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
      <KpiCard label="Total"      value={total}     icon={Users}      color={B.charcoal} />
      <KpiCard label="Personas"   value={personas}  icon={UserCircle} color={B.green}    />
      <KpiCard label="Empresas"   value={empresas}  icon={Building2}  color={B.gold}     />
      <KpiCard label="Con Puntos" value={conPuntos} icon={TrendingUp} color={B.terra}    />
    </div>
  );
}