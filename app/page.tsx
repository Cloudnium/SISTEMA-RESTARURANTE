//app/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';

import AppShell from '@/components/shared/AppShell';
import { AlertaStockModal } from '@/components/shared/AlertaStockModal';
import { useGlobalData } from '@/context/GlobalDataContext';
import DashboardView from '@/components/dashboard/DashboardView';
import MesasView from '@/components/mesas/MesasView';
import CocinaView from '@/components/cocina/CocinaView';
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
import { useAuth } from '@/lib/auth/AuthContext';
import AuthGuard from '@/components/auth/AuthGuard';
import VentaMesaView from '@/components/ventamesa/VentaMesaView';

const SOLO_ADMIN = ['dashboard', 'reportes', 'usuarios', 'respaldo'];
const VETADO_CAJERO = [...SOLO_ADMIN, 'cocina']; // Cocina es de cocinero + admin, no de cajero

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
    case  'venta-mesa':  return <VentaMesaView />;

    case 'cocina':      return <CocinaView />;
    case 'insumos':     return <InsumosView />;
    case 'almacen':     return <AlmacenView />;

    case 'clientes':    return <ClientesView />;
    case 'usuarios':     return <AuthGuard requiredRole="admin"><UsuariosView /></AuthGuard>;
    case 'cajas':       return <CajasView />;

    case 'comprobantes': return <ComprobantesView />;
    case 'compras' :    return <ComprasView/>;
    case 'reportes':     return <AuthGuard requiredRole="admin"><ReportesView /></AuthGuard>;

    case 'respaldo':     return <AuthGuard requiredRole="admin"><RespaldoView /></AuthGuard>;

    default:            return <PlaceholderView label={getLabelById(active)} />;
  }
}

// ─── Root page ────────────────────────────────────────────────────────────────
export default function Page() {
  const { usuario } = useAuth();
  const { productos, isLoading } = useGlobalData();
  const [active, setActive] = useState(
    () => usuario?.rol === 'cajero' ? 'ventas' : 'dashboard'
  );

  // ── Alerta de inventario al iniciar sesión ────────────────────────────────
  // Se muestra una sola vez por carga de la app (equivalente a "al iniciar
  // sesión", ya que Page() se monta de nuevo tras el login/redirect a "/").
  // alertaMostradaRef evita que reaparezca al cambiar de vista con el menú.
  const [mostrarAlertaStock, setMostrarAlertaStock] = useState(false);
  const alertaMostradaRef = useRef(false);

  useEffect(() => {
    if (usuario && !isLoading && productos.length > 0 && !alertaMostradaRef.current) {
      alertaMostradaRef.current = true;
      setMostrarAlertaStock(true);
    }
  }, [usuario, isLoading, productos]);

  const handleViewChange = (view: string) => {
    if (usuario?.rol === 'cajero' && VETADO_CAJERO.includes(view)) return;
    setActive(view);
  };

  return (
    <AuthGuard>
      <AppShell
        active={active}
        setActive={handleViewChange}
        userRole={usuario?.rol}
        userName={usuario?.nombre ?? ''}
      >
        {renderView(active)}
      </AppShell>

      <AlertaStockModal
        productos={productos}
        open={mostrarAlertaStock}
        onClose={() => setMostrarAlertaStock(false)}
      />
    </AuthGuard>
  );
}