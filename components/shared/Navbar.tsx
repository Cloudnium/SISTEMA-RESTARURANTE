// components/shared/Navbar.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { Menu, Bell, Settings, LogOut, Unlock } from 'lucide-react';
import { B } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import { useGlobalData } from '@/context/GlobalDataContext';
import { abrirCaja } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface NavbarProps {
  onOpenSidebar: () => void;
  userName?:     string;
}

export default function Navbar({ onOpenSidebar, userName }: NavbarProps) {
  const { logout, usuario }    = useAuth();
  const { cajas, refetchCajas } = useGlobalData();
  const router                 = useRouter();
  const [saliendo,   setSaliendo]   = useState(false);
  const [abriendo,   setAbriendo]   = useState(false);

  // La caja vinculada al usuario actual (si existe y está cerrada)
  const cajaVinculada = cajas.find(c => c.id === usuario?.caja_id);
  const mostrarAbrirCaja =
    cajaVinculada &&
    cajaVinculada.estado === 'cerrada' &&
    (usuario?.rol === 'admin' || usuario?.rol === 'cajero');

  const handleAbrirCaja = useCallback(async () => {
    if (!usuario || !cajaVinculada || abriendo) return;
    setAbriendo(true);
    try {
      await abrirCaja(cajaVinculada.id, usuario.id, 0);
      await db.from('cajas').update({ usuario_id: usuario.id }).eq('id', cajaVinculada.id);
      await refetchCajas();
    } catch (e) {
      console.warn('[Navbar] Error abriendo caja:', e);
    } finally {
      setAbriendo(false);
    }
  }, [usuario, cajaVinculada, abriendo, refetchCajas]);

  const handleLogout = useCallback(async () => {
    if (saliendo) return;
    setSaliendo(true);
    try { await logout(); } catch { /* ignorar */ } finally { router.replace('/login'); }
  }, [saliendo, logout, router]);

  const iconBtn = (
    title: string, icon: React.ReactNode, onClick?: () => void, color?: string,
  ) => (
    <button title={title} onClick={onClick}
      disabled={(title === 'Cerrar sesión' && saliendo)}
      className="p-2 rounded-lg transition-colors"
      style={{ color: color ?? B.muted }}
      onMouseEnter={e => { e.currentTarget.style.background = color === B.terra ? '#fef0ea' : B.creamDark; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      {icon}
    </button>
  );

  return (
    <header className="sticky top-0 z-10 flex items-center px-4 sm:px-6 h-14 border-b shrink-0"
      style={{ background: B.white, borderColor: B.creamDark }}>

      <button className="lg:hidden p-2 rounded-lg mr-2" style={{ color: B.charcoal }}
        onClick={onOpenSidebar}
        onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      {/* Botón abrir caja — solo si tiene caja vinculada cerrada */}
      {mostrarAbrirCaja && (
        <button
          onClick={handleAbrirCaja}
          disabled={abriendo}
          title={`Abrir ${cajaVinculada.nombre}`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold mr-3 transition-all"
          style={{
            background: abriendo ? B.muted : `${B.green}18`,
            color:      abriendo ? B.cream : B.green,
            border:     `1px solid ${B.green}40`,
          }}
          onMouseEnter={e => { if (!abriendo) e.currentTarget.style.background = `${B.green}30`; }}
          onMouseLeave={e => { if (!abriendo) e.currentTarget.style.background = `${B.green}18`; }}
        >
          <Unlock className="w-3.5 h-3.5" />
          {abriendo ? 'Abriendo...' : `Abrir ${cajaVinculada.nombre}`}
        </button>
      )}

      {/* Usuario mobile */}
      {userName && (
        <div className="flex lg:hidden items-center gap-2 mr-3 pr-3 border-r"
          style={{ borderColor: B.creamDark }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
            style={{ background: B.terra, color: B.cream }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <p className="text-xs font-semibold" style={{ color: B.charcoal }}>{userName}</p>
        </div>
      )}

      <div className="flex items-center gap-0.5">
        {iconBtn('Notificaciones', <Bell     className="w-5 h-5" />)}
        {iconBtn('Configuración',  <Settings className="w-5 h-5" />)}
        {iconBtn('Cerrar sesión',  <LogOut   className="w-5 h-5" />, handleLogout, B.terra)}
      </div>
    </header>
  );
}