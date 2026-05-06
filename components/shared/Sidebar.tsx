// components/shared/Sidebar.tsx
'use client';

import { X, LogOut } from 'lucide-react';
import { B, MENU_SECTIONS } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  open:      boolean;
  setOpen:   (v: boolean) => void;
  active:    string;
  setActive: (id: string) => void;
  userRole?: string;
  userName?: string;
}

const OCULTO_CAJERO   = ['dashboard', 'reportes', 'usuarios', 'respaldo', 'cajas'];
const OCULTO_COCINERO = ['cajas', 'compras', 'reportes', 'usuarios', 'respaldo', 'comprobantes'];

const ROL_LABEL: Record<string, string> = {
  admin:    'Administrador',
  cajero:   'Cajero',
  cocinero: 'Cocinero',
};

export default function Sidebar({ open, setOpen, active, setActive, userRole, userName }: SidebarProps) {
  const { logout } = useAuth();
  const router     = useRouter();

  const handleLogout = async () => {
    try { await logout(); } finally { router.replace('/login'); }
  };

  const secciones = MENU_SECTIONS.map(sec => ({
    ...sec,
    items: sec.items.filter(item => {
      if (userRole === 'cajero')   return !OCULTO_CAJERO.includes(item.id);
      if (userRole === 'cocinero') return !OCULTO_COCINERO.includes(item.id);
      return true;
    }),
  })).filter(sec => sec.items.length > 0);

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-20 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-30 flex flex-col transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ width: 260, background: B.charcoal }}
      >
        {/* Brand */}
        <div className="px-6 py-5 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase font-semibold" style={{ color: B.gold }}>
              Postres y Café
            </p>
            <p className="text-2xl font-black tracking-widest mt-0.5"
              style={{ color: B.cream, fontFamily: 'Georgia, "Times New Roman", serif' }}>
              MADRE
            </p>
          </div>
          <button className="lg:hidden p-1.5 rounded-lg" style={{ color: B.muted }}
            onClick={() => setOpen(false)}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Usuario — visible en ambos, pero en mobile también aparece en navbar */}
        {userName && (
          <div className="mx-4 mt-4 mb-1 p-3 rounded-xl flex items-center gap-3 shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
              style={{ background: B.terra, color: B.cream }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: B.cream }}>{userName}</p>
              <p className="text-xs" style={{ color: B.gold }}>{ROL_LABEL[userRole ?? ''] ?? userRole}</p>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5" style={{ scrollbarWidth: 'none' }}>
          {secciones.map(sec => (
            <div key={sec.title}>
              <p className="px-3 mb-1.5 text-[9px] font-black uppercase tracking-[0.2em]"
                style={{ color: 'rgba(201,168,76,0.45)' }}>
                {sec.title}
              </p>
              <div className="space-y-0.5">
                {sec.items.map(({ id, label, icon: Icon }) => {
                  const isActive = active === id;
                  return (
                    <button key={id}
                      onClick={() => { setActive(id); setOpen(false); }}
                      className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                      style={isActive
                        ? { background: B.green, color: B.cream, boxShadow: `0 2px 12px rgba(92,122,62,0.4)` }
                        : { color: 'rgba(245,237,216,0.5)' }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = B.cream; }}}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(245,237,216,0.5)'; }}}>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                          style={{ background: B.gold }} />
                      )}
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2}
                        style={isActive ? { color: B.goldLight } : {}} />
                      <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer con logout */}
        <div className="p-3 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-2"
            style={{ color: 'rgba(245,237,216,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(211,72,54,0.15)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(245,237,216,0.5)'; }}>
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
          <div className="text-center">
            <p className="text-xs font-bold" style={{ color: B.green }}>Cloudnium</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Sistema de gestión · v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}