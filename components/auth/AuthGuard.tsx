'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { B } from '@/lib/brand';
import type { RolUsuario } from '@/lib/supabase/types';

interface AuthGuardProps {
  children:      React.ReactNode;
  /** Si se especifica, solo ese rol puede ver el contenido. Omitir = cualquier autenticado. */
  requiredRole?: RolUsuario | RolUsuario[];
  /** Qué mostrar si no tiene permiso (default: redirige al inicio) */
  fallback?:     React.ReactNode;
}

export default function AuthGuard({ children, requiredRole, fallback }: AuthGuardProps) {
  const router              = useRouter();
  const { usuario, loading } = useAuth();

  useEffect(() => {
    if (!loading && !usuario) {
      router.replace('/login');
    }
  }, [usuario, loading, router]);

  // Cargando sesión
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: B.green }} />
          <p className="text-sm" style={{ color: B.muted }}>Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Sin sesión — useEffect redirige, aquí no renderizamos nada
  if (!usuario) return null;

  // Verificar rol si se especificó
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(usuario.rol)) {
      if (fallback) return <>{fallback}</>;
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#fee2e2' }}
          >
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: B.charcoal }}>
            Acceso restringido
          </h2>
          <p className="text-sm" style={{ color: B.muted }}>
            No tienes permisos para ver esta sección.
            <br />Contacta al administrador.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}