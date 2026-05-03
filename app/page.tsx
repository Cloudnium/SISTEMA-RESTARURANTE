//app/page.tsx
'use client';

import React, { useState } from 'react';

import AppShell from '@/components/shared/AppShell';
import DashboardView from '@/components/dashboard/DashboardView';
import MesasView from '@/components/mesas/MesasView';
import ProduccionView from '@/components/produccion/ProduccionView';
import InsumosView from '@/components/insumos/InsumosView';
import ReportesView from '@/components/reportes/ReportesView';
import PlaceholderView from '@/components/shared/Placeholderview';
import VentasView from '@/components/ventas/VentasView';
import ComprobantesView from '@/components/comprobantes/ComprobantesView';
import ClientesView from '@/components/clientes/ClientesView';
import { AlmacenView } from '@/components/almacen/AlmacenView';
import { UsuariosView } from '@/components/usuarios/UsuariosView';
import { CajasView } from '@/components/cajas/CajasView';
import { ComprasView } from '@/components/compras/ComprasView';
import { RespaldoView } from '@/components/respaldo/RespaldoView';

import { MENU_SECTIONS } from '@/lib/brand';

// ─── Resolve label for placeholder pages ──────────────────────────────────────
function getLabelById(id: string): string {
  for (const section of MENU_SECTIONS) {
    const item = section.items.find((i) => i.id === id);
    if (item) return item.label;
  }
  return id;
}

// ─── Router ───────────────────────────────────────────────────────────────────
function renderView(active: string): React.ReactNode {
  switch (active) {
    case 'dashboard':   return <DashboardView />;
    case 'mesas':       return <MesasView />;
    case 'ventas':      return <VentasView />;

    case 'produccion':  return <ProduccionView />;
    case 'insumos':     return <InsumosView />;
    case 'almacen':     return <AlmacenView />;

    case 'clientes':    return <ClientesView />;
    case 'usuarios':    return <UsuariosView />;
    case 'cajas':       return <CajasView />;

    case 'comprobantes': return <ComprobantesView />;
    case 'compras' :    return <ComprasView/>;
    case 'reportes':    return <ReportesView />;

    case 'respaldo':    return <RespaldoView />;

    default:            return <PlaceholderView label={getLabelById(active)} />;
  }
}

// ─── Root page ────────────────────────────────────────────────────────────────
export default function Page() {
  const [active, setActive] = useState('dashboard');

  return (
    <AppShell active={active} setActive={setActive}>
      {renderView(active)}
    </AppShell>
  );
}