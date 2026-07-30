// components/shared/Navbar.tsx
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Menu, Bell, Settings, LogOut, Unlock, ChefHat, X } from 'lucide-react';
import { B } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import { useGlobalData } from '@/context/GlobalDataContext';
import { abrirCaja, marcarNotificacionLeida } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface NavbarProps {
  onOpenSidebar: () => void;
  userName?:     string;
}

function tiempoRelativo(iso: string) {
  const minutos = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 1)  return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return new Date(iso).toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
}

export default function Navbar({ onOpenSidebar, userName }: NavbarProps) {
  const { logout, usuario }     = useAuth();
  const { cajas, refetchCajas, notificaciones, refetchNotificaciones } = useGlobalData();
  const router                  = useRouter();
  const [saliendo,   setSaliendo]   = useState(false);
  const [abriendo,   setAbriendo]   = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [marcando,   setMarcando]   = useState<Set<string>>(new Set());
  const notifRef = useRef<HTMLDivElement>(null);

  // Carga inicial de notificaciones sin leer (el realtime se encarga de las nuevas)
  useEffect(() => {
    if (usuario) refetchNotificaciones();
  }, [usuario, refetchNotificaciones]);

  // Cierra el dropdown al hacer clic afuera
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

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

  const handleMarcarLeida = useCallback(async (id: string) => {
    setMarcando(prev => new Set(prev).add(id));
    try {
      await marcarNotificacionLeida(id);
      await refetchNotificaciones();
    } catch (e) {
      console.warn('[Navbar] Error marcando notificación:', e);
    } finally {
      setMarcando(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  }, [refetchNotificaciones]);

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
        {/* Notificaciones */}
        <div className="relative" ref={notifRef}>
          <button
            title="Notificaciones"
            onClick={() => setNotifOpen(v => !v)}
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: notifOpen ? B.green : B.muted }}
            onMouseEnter={e => { e.currentTarget.style.background = B.creamDark; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Bell className="w-5 h-5" />
            {notificaciones.length > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-16px h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: B.terra, color: '#fff' }}
              >
                {notificaciones.length > 9 ? '9+' : notificaciones.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl overflow-hidden shadow-2xl z-20"
              style={{ background: B.white, border: `1px solid ${B.creamDark}` }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: B.cream }}
              >
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: B.charcoal }}>
                  Notificaciones
                </p>
                <button onClick={() => setNotifOpen(false)} style={{ color: B.muted }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notificaciones.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10" style={{ color: B.muted }}>
                    <Bell className="w-8 h-8 opacity-25" />
                    <p className="text-xs">Sin notificaciones pendientes</p>
                  </div>
                ) : (
                  notificaciones.map(n => (
                    <div
                      key={n.id}
                      className="flex items-start gap-2.5 px-4 py-3 border-b transition-opacity"
                      style={{ borderColor: B.cream, opacity: marcando.has(n.id) ? 0.5 : 1 }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `${B.green}18`, color: B.green }}
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold" style={{ color: B.charcoal }}>{n.titulo}</p>
                        <p className="text-xs mt-0.5" style={{ color: B.muted }}>{n.mensaje}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px]" style={{ color: B.muted }}>
                            {tiempoRelativo(n.created_at)}
                          </span>
                          <button
                            onClick={() => handleMarcarLeida(n.id)}
                            disabled={marcando.has(n.id)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${B.green}15`, color: B.green }}
                          >
                            Listo, entendido
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {iconBtn('Configuración',  <Settings className="w-5 h-5" />)}
        {iconBtn('Cerrar sesión',  <LogOut   className="w-5 h-5" />, handleLogout, B.terra)}
      </div>
    </header>
  );
}