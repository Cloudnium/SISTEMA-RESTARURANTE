// app/login/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { B } from '@/lib/brand';
import Image from 'next/image';

export default function LoginPage() {
  const router                          = useRouter();
  const { usuario, login, loading: authLoading } = useAuth();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  // Si ya hay sesión activa, redirigir
  useEffect(() => {
    if (!authLoading && usuario) router.replace('/');
  }, [usuario, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${B.charcoal} 0%, ${B.charcoalLight} 100%)` }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.gold }} />
      </div>
    );
  }

  if (usuario) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await login(email, password);
      if (ok) router.replace('/');
      else setError('Correo o contraseña incorrectos');
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${B.charcoal} 0%, #1a2e24 50%, ${B.charcoal} 100%)` }}
    >
      {/* Decoración de fondo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: B.gold, filter: 'blur(80px)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: B.terra, filter: 'blur(80px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-600px h-600px rounded-full opacity-5"
          style={{ background: B.green, filter: 'blur(120px)' }} />
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl"
        style={{ background: B.white, boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}
      >
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="rounded-2xl p-4 mb-2" style={{ background: B.charcoal }}>
            <Image
              src="/icons/icono.png"
              alt="Madre Postres y Café"
              width={200}
              height={100}
              style={{ objectFit: 'contain', width: 180, height: 'auto' }}
              priority
            />
          </div>
          <p className="text-sm mt-3" style={{ color: B.muted }}>
            Sistema de gestión · Inicia sesión
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              className="block text-xs font-black uppercase tracking-widest mb-1.5"
              style={{ color: B.muted }}
            >
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="usuario@madre.com"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: B.cream, border: `2px solid ${B.creamDark}`, color: B.charcoal }}
              onFocus={e => {
                e.currentTarget.style.borderColor = B.green;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${B.green}20`;
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = B.creamDark;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label
              className="block text-xs font-black uppercase tracking-widest mb-1.5"
              style={{ color: B.muted }}
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={loading}
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all"
                style={{ background: B.cream, border: `2px solid ${B.creamDark}`, color: B.charcoal }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = B.green;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${B.green}20`;
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = B.creamDark;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                style={{ color: B.muted }}
                onMouseEnter={e => e.currentTarget.style.color = B.charcoal}
                onMouseLeave={e => e.currentTarget.style.color = B.muted}
              >
                {showPassword
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye    className="w-4 h-4" />
                }
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: '#fef0e6', color: B.terra, border: `1px solid ${B.terra}30` }}
            >
              {error}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-black tracking-wide transition-all flex items-center justify-center gap-2"
            style={{
              background: loading ? B.muted : B.charcoal,
              color: B.cream,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = B.charcoalLight; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = B.charcoal; }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando sesión...</>
              : 'Iniciar sesión'
            }
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: B.muted }}>
            ¿Olvidaste tu contraseña? Contacta al administrador.
          </p>
        </div>
      </div>

      {/* Watermark */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs"
        style={{ color: 'rgba(255,255,255,0.25)' }}
      >
        Powered by Cloudnium · v1.0.0
      </div>
    </div>
  );
}