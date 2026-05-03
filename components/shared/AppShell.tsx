//components/shared/AppShell.tsx
'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { B } from '@/lib/brand';

interface AppShellProps {
  active: string;
  setActive: (id: string) => void;
  children: React.ReactNode;
}

const SIDEBAR_W = 260;

export default function AppShell({ active, setActive, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    /*
     * Layout strategy: the page is split into two columns using inline flexbox.
     * The sidebar column is a fixed-width spacer on desktop (hidden on mobile).
     * This avoids any conflict between `position: fixed` and margin/padding offsets.
     */
    <div className="flex min-h-screen" style={{ background: B.pageBg }}>

      {/* ── Sidebar (fixed, always on top) ── */}
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        active={active}
        setActive={setActive}
      />

      {/*
       * Desktop spacer: reserves the exact same width as the fixed sidebar so
       * the right column is naturally pushed to the right. Hidden on mobile
       * because the sidebar slides in as an overlay there.
       */}
      <div className="hidden lg:block shrink-0" style={{ width: SIDEBAR_W }} />

      {/* ── Right column: navbar + page content ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Navbar — sticky to top of this column, NOT fixed to viewport */}
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}