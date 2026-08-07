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
import { ImpresionView } from '@/components/impresion/ImpresionView';
import { MENU_SECTIONS } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import AuthGuard from '@/components/auth/AuthGuard';
import VentaMesaView from '@/components/ventamesa/VentaMesaView';

const SOLO_ADMIN = ['dashboard', 'reportes', 'usuarios', 'respaldo'];
const VETADO_CAJERO = [...SOLO_ADMIN, 'cocina']; // Cocina es de cocinero + admin, no de cajero

// FIX PERMISOS POR ROL: antes solo existía una lista de vetos para 'cajero'
// (VETADO_CAJERO); el rol 'cocinero' no tenía ninguna, así que desde el menú
// (o incluso manipulando el estado `active` por consola) un cocinero podía
// llegar a Ventas, Venta Mesa, Cajas, Comprobantes, Compras y Clientes —
// vistas que además no tenían AuthGuard propio (ver renderView abajo), o
// sea que no había ninguna barrera, ni en el clic del menú ni en la vista.
// Cocinero solo debe operar Cocina, Productos (insumos) y Almacén.
const VETADO_COCINERO = [
  ...SOLO_ADMIN,
  'mesas', 'venta-mesa', 'ventas', 'cajas', 'comprobantes', 'compras', 'clientes', 'impresion',
];

// Vista con la que debe arrancar cada rol al iniciar sesión o recargar.
const VISTA_INICIAL_POR_ROL: Record<string, string> = {
  cajero:   'ventas',
  cocinero: 'cocina',
  admin:    'dashboard',
};

function vistaInicialPara(rol?: string): string {
  return (rol && VISTA_INICIAL_POR_ROL[rol]) || 'dashboard';
}

// ─── Resolve label for placeholder pages ──────────────────────────────────────
function getLabelById(id: string): string {
  for (const section of MENU_SECTIONS) {
    const item = section.items.find((i) => i.id === id);
    if (item) return item.label;
  }
  return id;
}

// ─── Router ───────────────────────────────────────────────────────────────────
// FIX PERMISOS POR ROL: antes solo 'usuarios', 'reportes' y 'respaldo' estaban
// protegidas con <AuthGuard requiredRole>. El resto de vistas se renderizaba
// para cualquier usuario autenticado sin importar su rol — la única barrera
// era el clic en el menú (handleViewChange más abajo), que es trivial de
// saltar (cambiando `active` desde React DevTools, por ejemplo). Se agrega
// AuthGuard también a las vistas operativas/financieras que Cocinero no debe
// poder ver ni accionar, como segunda capa de defensa además del menú.
function renderView(active: string): React.ReactNode {
  switch (active) {
    case 'dashboard':   return <DashboardView />;
    case 'mesas':       return <AuthGuard requiredRole={['admin', 'cajero']}><MesasView /></AuthGuard>;
    case 'ventas':      return <AuthGuard requiredRole={['admin', 'cajero']}><VentasView /></AuthGuard>;
    case  'venta-mesa':  return <AuthGuard requiredRole={['admin', 'cajero']}><VentaMesaView /></AuthGuard>;

    case 'cocina':      return <AuthGuard requiredRole={['admin', 'cocinero']}><CocinaView /></AuthGuard>;
    case 'insumos':     return <InsumosView />;
    case 'almacen':     return <AlmacenView />;

    case 'clientes':    return <AuthGuard requiredRole={['admin', 'cajero']}><ClientesView /></AuthGuard>;
    case 'usuarios':     return <AuthGuard requiredRole="admin"><UsuariosView /></AuthGuard>;
    case 'cajas':       return <AuthGuard requiredRole={['admin', 'cajero']}><CajasView /></AuthGuard>;

    case 'comprobantes': return <AuthGuard requiredRole={['admin', 'cajero']}><ComprobantesView /></AuthGuard>;
    case 'compras' :    return <AuthGuard requiredRole={['admin', 'cajero']}><ComprasView/></AuthGuard>;
    case 'reportes':     return <AuthGuard requiredRole="admin"><ReportesView /></AuthGuard>;

    case 'respaldo':     return <AuthGuard requiredRole="admin"><RespaldoView /></AuthGuard>;

    case 'impresion':    return <AuthGuard requiredRole={['admin', 'cajero']}><ImpresionView /></AuthGuard>;

    default:            return <PlaceholderView label={getLabelById(active)} />;
  }
}

// ─── Root page ────────────────────────────────────────────────────────────────
export default function Page() {
  const { usuario } = useAuth();
  const { productos, isLoading } = useGlobalData();
  const [active, setActive] = useState('dashboard');

  // ── Vista inicial según el rol ────────────────────────────────────────────
  // FIX: antes esto se resolvía con `useState(() => usuario?.rol === 'cajero'
  // ? 'ventas' : 'dashboard')`. Ese inicializador "lazy" de useState SOLO
  // corre en el primerísimo render del componente — y en ese momento
  // `usuario` todavía es `null`, porque AuthContext resuelve la sesión de
  // forma asíncrona. Por eso `active` quedaba fijo en 'dashboard' para
  // SIEMPRE (tanto al iniciar sesión como al recargar la página), sin
  // importar el rol real — y el rol "cocinero" ni siquiera tenía una rama
  // propia en el ternario.
  //
  // Patrón "ajustar estado durante el render" (igual que en
  // ModalHistorialCocina.tsx) en vez de un useEffect: corrige la vista en el
  // mismo render en que `usuario` queda disponible — sin parpadeo de un
  // frame mostrando 'dashboard' antes de corregirse — y sin el aviso del
  // compilador de React sobre setState dentro de un efecto.
  const [usuarioIdVistaAsignada, setUsuarioIdVistaAsignada] = useState<string | null>(null);
  if (usuario && usuario.id !== usuarioIdVistaAsignada) {
    setUsuarioIdVistaAsignada(usuario.id);
    setActive(vistaInicialPara(usuario.rol));
  }

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
    if (usuario?.rol === 'cocinero' && VETADO_COCINERO.includes(view)) return;
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