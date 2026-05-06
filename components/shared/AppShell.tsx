// components/shared/AppShell.tsx
'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';
import { B }   from '@/lib/brand';

interface AppShellProps {
  active:    string;
  setActive: (id: string) => void;
  children:  React.ReactNode;
  userRole?: string;
  userName?: string;
}

export default function AppShell({ active, setActive, children, userRole, userName = '' }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: B.pageBg }}>
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        active={active}
        setActive={setActive}
        userRole={userRole}
        userName={userName}
      />
      <div className="hidden lg:block shrink-0" style={{ width: 260 }} />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} userName={userName} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}