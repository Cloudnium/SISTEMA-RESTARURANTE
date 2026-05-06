// components/shared/Navbar.tsx
'use client';

import React from 'react';
import { Menu, Bell, Settings, LogOut } from 'lucide-react';
import { B } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  onOpenSidebar: () => void;
  userName?:     string;
}

export default function Navbar({ onOpenSidebar, userName }: NavbarProps) {
  const { logout } = useAuth();
  const router     = useRouter();

  const handleLogout = async () => {
    try { await logout(); } finally { router.replace('/login'); }
  };

  const iconBtn = (title: string, icon: React.ReactNode, onClick?: () => void, color?: string) => (
    <button title={title} onClick={onClick}
      className="p-2 rounded-lg transition-colors"
      style={{ color: color ?? B.muted }}
      onMouseEnter={e => e.currentTarget.style.background = color === B.terra ? '#fef0ea' : B.creamDark}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {icon}
    </button>
  );

  return (
    <header className="sticky top-0 z-10 flex items-center px-4 sm:px-6 h-14 border-b shrink-0"
      style={{ background: B.white, borderColor: B.creamDark }}>

      {/* Hamburger — solo mobile */}
      <button className="lg:hidden p-2 rounded-lg mr-2" style={{ color: B.charcoal }}
        onClick={onOpenSidebar}
        onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      {/* Usuario — solo mobile (en desktop ya aparece en sidebar) */}
      {userName && (
        <div className="flex lg:hidden items-center gap-2 mr-3 pr-3 border-r" style={{ borderColor: B.creamDark }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
            style={{ background: B.terra, color: B.cream }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <p className="text-xs font-semibold" style={{ color: B.charcoal }}>{userName}</p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-0.5">
        {iconBtn('Notificaciones', <Bell className="w-5 h-5" />)}
        {iconBtn('Configuración',  <Settings className="w-5 h-5" />)}
        {iconBtn('Cerrar sesión',  <LogOut className="w-5 h-5" />, handleLogout, B.terra)}
      </div>
    </header>
  );
}