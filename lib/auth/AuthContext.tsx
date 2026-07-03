// lib/auth/AuthContext.tsx
'use client';

import React, {
  createContext, useContext, useEffect, useState,
  useCallback, useRef,
} from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Usuario } from '@/lib/supabase/types';

// ─── Constantes ───────────────────────────────────────────────────────────────
const SESSION_TOKEN_KEY  = 'madre_session_token';
const HEARTBEAT_INTERVAL = 2 * 60 * 1000;  // 2 min — actualiza ultima_actividad
const VERIFY_INTERVAL    = 30 * 1000;       // 30 seg — FIX: era 5 seg, innecesario y agresivo

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface AuthContextType {
  usuario:  Usuario | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<boolean>;
  logout:   () => Promise<void>;
}

// ─── Helpers de token ─────────────────────────────────────────────────────────
function generarToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}
function guardarToken(token: string) {
  try { localStorage.setItem(SESSION_TOKEN_KEY, token); }   catch { /* incógnito */ }
  try { sessionStorage.setItem(SESSION_TOKEN_KEY, token); } catch { /* ignorar */ }
}
function leerToken(): string | null {
  try { return localStorage.getItem(SESSION_TOKEN_KEY) ?? sessionStorage.getItem(SESSION_TOKEN_KEY); }
  catch { return null; }
}
function borrarToken() {
  try { localStorage.removeItem(SESSION_TOKEN_KEY); }   catch { /* ignorar */ }
  try { sessionStorage.removeItem(SESSION_TOKEN_KEY); } catch { /* ignorar */ }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs — siempre actualizados, disponibles en callbacks sin re-renders
  const usuarioRef       = useRef<Usuario | null>(null);
  const tokenRef         = useRef<string | null>(null);
  const logoutCalledRef  = useRef(false);
  const canalSesionRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const verifyRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mantener usuarioRef sincronizado
  useEffect(() => { usuarioRef.current = usuario; }, [usuario]);

  // ── Limpieza ──────────────────────────────────────────────────────────────
  const limpiarIntervalos = useCallback(() => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (verifyRef.current)    { clearInterval(verifyRef.current);    verifyRef.current    = null; }
  }, []);

  const limpiarCanal = useCallback(() => {
    if (canalSesionRef.current) {
      supabase.removeChannel(canalSesionRef.current);
      canalSesionRef.current = null;
    }
  }, []);

  // ── Cargar perfil ─────────────────────────────────────────────────────────
  const cargarPerfil = useCallback(async (userId: string): Promise<Usuario | null> => {
    const { data } = await supabase
      .from('usuarios')
      .select('*, caja:cajas!fk_usuarios_caja(id, nombre, estado)')
      .eq('id', userId)
      .single();
    return data as Usuario | null;
  }, []);

  // ── Registrar sesión ──────────────────────────────────────────────────────
  // FIX: ahora retorna una Promise que resuelve cuando el INSERT está confirmado.
  // Antes era fire-and-forget, lo que causaba que el polling arrancara antes
  // de que la sesión existiera en BD.
  const registrarSesion = useCallback(async (userId: string): Promise<string> => {
    const token = generarToken();
    guardarToken(token);
    tokenRef.current = token;

    try {
      const res = await fetch('/api/sesiones', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ usuario_id: userId, token }),
      });
      if (!res.ok) {
        console.warn('[Auth] registrarSesion: respuesta no-ok', res.status);
      }
    } catch (e) {
      // No es bloqueante: el usuario ya está autenticado vía Supabase Auth.
      // El polling simplemente no detectará cierres remotos en esta sesión.
      console.warn('[Auth] registrarSesion falló (red):', e);
    }

    return token;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (logoutCalledRef.current) return;
    logoutCalledRef.current = true;

    limpiarIntervalos();
    limpiarCanal();

    // Marcar sesión como cerrada en BD
    const token = tokenRef.current ?? leerToken();
    if (token) {
      fetch('/api/sesiones', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      }).catch(e => console.warn('[Auth] cerrar sesión BD falló:', e));
    }

    // Cerrar caja asignada al usuario si está abierta
    const u = usuarioRef.current;
    if (u?.caja_id) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('cajas')
          .update({ estado: 'cerrada', fecha_cierre: new Date().toISOString() })
          .eq('id', u.caja_id)
          .eq('estado', 'abierta');
      } catch { /* no crítico */ }
    }

    borrarToken();
    tokenRef.current   = null;
    usuarioRef.current = null;
    setUsuario(null);

    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k));
    } catch { /* ignorar */ }

    await supabase.auth.signOut({ scope: 'local' });
    logoutCalledRef.current = false;
  }, [limpiarIntervalos, limpiarCanal]);

  // ── Iniciar vigilancia de sesión ──────────────────────────────────────────
  const iniciarVigilancia = useCallback((token: string, onInvalidada: () => void) => {
    limpiarIntervalos();
    limpiarCanal();

    // ── MECANISMO 1: Polling cada 30 segundos ─────────────────────────────
    // FIX: era 5 seg. Con 5 seg, si la BD tiene cualquier latencia en la
    // primera verificación post-login, retorna false y saca al usuario.
    // 30 seg es más que suficiente para detectar cierres remotos.
    verifyRef.current = setInterval(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: activa } = await (supabase.rpc as any)('fn_verificar_sesion', { p_token: token });
        if (activa === false) {
          console.info('[Auth] Sesión invalidada (polling). Cerrando...');
          onInvalidada();
        }
      } catch { /* no crítico */ }
    }, VERIFY_INTERVAL);

    // ── MECANISMO 2: Heartbeat cada 2 min ────────────────────────────────
    heartbeatRef.current = setInterval(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.rpc as any)('fn_heartbeat_sesion', { p_token: token });
      } catch { /* no crítico */ }
    }, HEARTBEAT_INTERVAL);

    // ── MECANISMO 3: Realtime ─────────────────────────────────────────────
    const canal = supabase
      .channel(`sesion-watch-${token.slice(0, 10)}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'sesiones',
          filter: `token=eq.${token}`,
        },
        (payload) => {
          if (payload.new?.activa === false) {
            console.info('[Auth] Sesión invalidada (realtime). Cerrando...');
            onInvalidada();
          }
        },
      )
      .subscribe();

    canalSesionRef.current = canal;
  }, [limpiarIntervalos, limpiarCanal]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      console.warn('[Auth] Error login:', error?.message);
      return false;
    }

    const perfil = await cargarPerfil(data.user.id);
    if (!perfil) {
      console.error('[Auth] No se encontró perfil en public.usuarios');
      return false;
    }

    setUsuario(perfil);
    usuarioRef.current = perfil;

    // FIX: registrarSesion ahora es awaited — la sesión está en BD
    // antes de que iniciarVigilancia empiece el polling.
    const token = await registrarSesion(data.user.id);
    iniciarVigilancia(token, () => logout());

    return true;
  }, [cargarPerfil, registrarSesion, iniciarVigilancia, logout]);

  // ── Inicialización al montar ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function inicializar() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        borrarToken();
        if (!cancelled) setLoading(false);
        return;
      }

      const token = leerToken();

      if (token) {
        // Verificar si fue invalidada mientras el navegador estuvo cerrado
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: activa } = await (supabase.rpc as any)('fn_verificar_sesion', { p_token: token });

        // FIX: antes el check era `activa === false`, lo que significa que si
        // fn_verificar_sesion devuelve null (error de red, función no existe, etc.)
        // NO cerraba sesión — eso es correcto. Se mantiene igual.
        if (activa === false) {
          // Sesión explícitamente invalidada por un admin → forzar logout
          borrarToken();
          await supabase.auth.signOut();
          if (!cancelled) setLoading(false);
          return;
        }

        // activa === true (normal) o activa === null (error de red → beneficio de la duda)
        tokenRef.current = token;
        const perfil = await cargarPerfil(session.user.id);
        if (!cancelled) {
          setUsuario(perfil);
          usuarioRef.current = perfil;
        }
        iniciarVigilancia(token, () => logout());
      } else {
        // No hay token local pero sí sesión Auth activa.
        // Puede pasar en: otro dispositivo, localStorage limpiado, primera carga post-deploy.
        // FIX: registrarSesion es awaited → la sesión está confirmada en BD
        // antes de activar el polling. Se elimina el setTimeout(300) que era insuficiente.
        const perfil = await cargarPerfil(session.user.id);
        if (!cancelled) {
          setUsuario(perfil);
          usuarioRef.current = perfil;
        }
        const nuevoToken = await registrarSesion(session.user.id);
        iniciarVigilancia(nuevoToken, () => logout());
      }

      if (!cancelled) setLoading(false);
    }

    inicializar();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        limpiarIntervalos();
        limpiarCanal();
        borrarToken();
        tokenRef.current   = null;
        usuarioRef.current = null;
        setUsuario(null);
        setLoading(false);
        return;
      }
      if (event === 'TOKEN_REFRESHED' && session.user) {
        // JWT de Supabase se renovó — el token de sesión en BD no cambia,
        // solo se actualiza el perfil por si cambió algo.
        const perfil = await cargarPerfil(session.user.id);
        setUsuario(perfil);
        usuarioRef.current = perfil;
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      limpiarIntervalos();
      // Canal NO se limpia aquí para sobrevivir el re-mount de React StrictMode
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}