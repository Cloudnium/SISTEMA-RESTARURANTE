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
    case 'produccion':  return <ProduccionView />;
    case 'insumos':     return <InsumosView />;
    case 'reportes':    return <ReportesView />;
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