// lib/auth/AuthContext.tsx
'use client';

import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Usuario } from '@/lib/supabase/types';

interface AuthContextType {
  usuario:  Usuario | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<boolean>;
  logout:   () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarPerfil = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('usuarios')
      .select('*, caja:cajas!fk_usuarios_caja(nombre, estado)')
      .eq('id', userId)
      .single();
    
    setUsuario(data as Usuario | null);
  }, []);

  // Verificar sesión al montar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        cargarPerfil(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await cargarPerfil(session.user.id);
        } else {
          setUsuario(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [cargarPerfil]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Error al iniciar sesión:', error.message);
      return false;
    }
    return true;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}