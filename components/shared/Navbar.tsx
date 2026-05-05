'use client';

import React from 'react';
import { Menu, Bell, Settings, LogOut } from 'lucide-react';
import { B } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  onOpenSidebar: () => void;
  userName?:     string;
  userRole?:     string;
}

const ROL_LABEL: Record<string, string> = {
  admin:    'Administrador',
  cajero:   'Cajero',
  cocinero: 'Cocinero',
};

export default function Navbar({ onOpenSidebar, userName, userRole }: NavbarProps) {
  const { logout } = useAuth();
  const router     = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <header
      className="sticky top-0 z-10 flex items-center px-6 h-14 border-b shrink-0"
      style={{ background: B.white, borderColor: B.creamDark }}
    >
      <button className="lg:hidden p-2 rounded-lg mr-3" style={{ color: B.charcoal }} onClick={onOpenSidebar}>
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      {/* Info usuario — desktop */}
      {userName && (
        <div className="hidden sm:flex items-center gap-3 mr-3 pr-3 border-r" style={{ borderColor: B.creamDark }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
            style={{ background: B.terra, color: B.cream }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold leading-tight" style={{ color: B.charcoal }}>{userName}</p>
            <p className="text-[10px] leading-tight" style={{ color: B.gold }}>
              {ROL_LABEL[userRole ?? ''] ?? userRole}
            </p>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-1">
        <button title="Notificaciones" className="p-2 rounded-lg transition-colors" style={{ color: B.muted }}
          onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Bell className="w-5 h-5" />
        </button>
        <button title="Configuración" className="p-2 rounded-lg transition-colors" style={{ color: B.muted }}
          onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Settings className="w-5 h-5" />
        </button>
        <button title="Cerrar sesión" className="p-2 rounded-lg transition-colors" style={{ color: B.terra }}
          onClick={handleLogout}
          onMouseEnter={e => e.currentTarget.style.background = '#fef0ea'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}