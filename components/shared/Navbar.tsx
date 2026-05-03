//components/shared/Navbar.tsx
'use client';

import React from 'react';
import { Menu, Bell, Settings, LogOut } from 'lucide-react';
import { B } from '@/lib/brand';

interface NavbarProps {
  onOpenSidebar: () => void;
}

export default function Navbar({ onOpenSidebar }: NavbarProps) {
  return (
    /*
     * sticky + top-0 keeps the navbar pinned to the top of the right column
     * while scrolling, without using `position: fixed` which would cause it
     * to escape the flex layout and overlap the sidebar.
     */
    <header
      className="sticky top-0 z-10 flex items-center px-6 h-14 border-b shrink-0"
      style={{
        background: B.white,
        borderColor: B.creamDark,
      }}
    >
      {/* Mobile hamburger */}
      <button
        className="lg:hidden p-2 rounded-lg mr-3"
        style={{ color: B.charcoal }}
        onClick={onOpenSidebar}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {[
          { Icon: Bell,     title: 'Notificaciones', hoverBg: B.creamDark, color: B.muted },
          { Icon: Settings, title: 'Configuración',  hoverBg: B.creamDark, color: B.muted },
        ].map(({ Icon, title, hoverBg, color }) => (
          <button
            key={title}
            title={title}
            className="p-2 rounded-lg transition-colors"
            style={{ color }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Icon className="w-5 h-5" />
          </button>
        ))}

        <button
          title="Cerrar sesión"
          className="p-2 rounded-lg transition-colors"
          style={{ color: B.terra }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#fef0ea')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}