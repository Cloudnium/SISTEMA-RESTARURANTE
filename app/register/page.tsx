// app/register/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { B } from '@/lib/brand';
import { supabase as _supabase } from '@/lib/supabase/client';
import type { RolUsuario } from '@/lib/supabase/types';

// Cliente con tipado relajado para escrituras — mismo patrón que queries/index.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = _supabase as any;
const supabase = _supabase;

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface FormData {
  nombre:          string;
  email:           string;
  password:        string;
  confirmPassword: string;
  rol:             RolUsuario;
  dni:             string;
}

const ROLES: { value: RolUsuario; label: string; desc: string }[] = [
  { value: 'cajero',   label: 'Cajero',   desc: 'Ventas, clientes y caja'   },
  { value: 'cocinero', label: 'Cocinero', desc: 'Producción e insumos'       },
  { value: 'admin',    label: 'Admin',    desc: 'Acceso completo al sistema' },
];

// ─── Select de rol personalizado ─────────────────────────────────────────────
function RolSelect({
  value, onChange, disabled,
}: {
  value:    RolUsuario;
  onChange: (v: RolUsuario) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = ROLES.find(r => r.value === value)!;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 rounded-xl text-sm text-left flex items-center justify-between transition-all outline-none"
        style={{
          background: B.cream,
          border:     `2px solid ${open ? B.green : B.creamDark}`,
          color:      B.charcoal,
          boxShadow:  open ? `0 0 0 3px ${B.green}20` : 'none',
          cursor:     disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span className="font-medium">{selected.label}</span>
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{ color: B.muted, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-xl"
          style={{ background: B.white, border: `1px solid ${B.creamDark}` }}
        >
          {ROLES.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => { onChange(r.value); setOpen(false); }}
              className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors"
              style={{
                background:   r.value === value ? `${B.green}15` : 'transparent',
                borderBottom: `1px solid ${B.cream}`,
              }}
              onMouseEnter={e => { if (r.value !== value) e.currentTarget.style.background = B.cream; }}
              onMouseLeave={e => { if (r.value !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{r.label}</p>
                <p className="text-xs mt-0.5" style={{ color: B.muted }}>{r.desc}</p>
              </div>
              {r.value === value && (
                <Check className="w-4 h-4 shrink-0" style={{ color: B.green }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-xs font-black uppercase tracking-widest mb-1.5"
        style={{ color: B.muted }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Input reutilizable ───────────────────────────────────────────────────────
function Input({
  type = 'text', value, onChange, placeholder, disabled, right,
}: {
  type?:        string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  disabled?:    boolean;
  right?:       React.ReactNode;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required
        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
        style={{
          background:   B.cream,
          border:       `2px solid ${B.creamDark}`,
          color:        B.charcoal,
          paddingRight: right ? '3rem' : undefined,
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = B.green;
          e.currentTarget.style.boxShadow   = `0 0 0 3px ${B.green}20`;
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = B.creamDark;
          e.currentTarget.style.boxShadow   = 'none';
        }}
      />
      {right && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router                            = useRouter();
  const { usuario, loading: authLoading } = useAuth();

  const [form, setForm] = useState<FormData>({
    nombre:          '',
    email:           '',
    password:        '',
    confirmPassword: '',
    rol:             'cajero',
    dni:             '',
  });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);

  // Solo admins pueden acceder a esta página
  useEffect(() => {
    if (!authLoading) {
      if (!usuario)                     router.replace('/login');
      else if (usuario.rol !== 'admin') router.replace('/');
    }
  }, [usuario, authLoading, router]);

  if (authLoading || !usuario || usuario.rol !== 'admin') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${B.charcoal} 0%, ${B.charcoalLight} 100%)` }}
      >
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.gold }} />
      </div>
    );
  }

  const set = (key: keyof FormData) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  // ── Validaciones ─────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (!form.nombre.trim())                        return 'El nombre es obligatorio.';
    if (form.nombre.trim().length < 3)              return 'El nombre debe tener al menos 3 caracteres.';
    if (!form.email.includes('@'))                  return 'Ingresa un correo válido.';
    if (form.password.length < 6)                   return 'La contraseña debe tener al menos 6 caracteres.';
    if (form.password !== form.confirmPassword)     return 'Las contraseñas no coinciden.';
    if (form.dni && !/^\d{8}$/.test(form.dni))     return 'El DNI debe tener exactamente 8 dígitos.';
    return null;
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      // 1. Crear usuario en Supabase Auth (email confirmado automáticamente — sistema interno)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email:         form.email.trim().toLowerCase(),
        password:      form.password,
        email_confirm: true,
        user_metadata: { nombre: form.nombre.trim(), rol: form.rol },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario en Auth.');

      // 2. El trigger fn_crear_perfil_usuario ya insertó la fila en public.usuarios.
      //    Actualizamos para asegurarnos de tener nombre, rol y dni correctos.
      //    FIX: usar `db` (tipado relajado) — evita error ts(2345) en .update()
      const { error: updateError } = await db
        .from('usuarios')
        .update({
          nombre: form.nombre.trim(),
          rol:    form.rol,
          dni:    form.dni.trim() || null,
        })
        .eq('id', authData.user.id);

      if (updateError) {
        // No es fatal — el usuario ya fue creado en Auth correctamente.
        console.warn('Advertencia al actualizar perfil:', updateError.message);
      }

      setSuccess(true);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';

      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('Este correo ya está registrado en el sistema.');
      } else if (msg.includes('invalid email')) {
        setError('El correo electrónico no es válido.');
      } else if (msg.includes('password')) {
        setError('La contraseña no cumple los requisitos mínimos.');
      } else {
        setError(`Error al crear el usuario: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Pantalla de éxito ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${B.charcoal} 0%, #1a2e24 50%, ${B.charcoal} 100%)` }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: B.green, filter: 'blur(80px)' }} />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: B.gold, filter: 'blur(80px)' }} />
        </div>

        <div
          className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl text-center"
          style={{ background: B.white, boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: `${B.green}18` }}
          >
            <Check className="w-8 h-8" style={{ color: B.green }} />
          </div>

          <h2
            className="text-2xl font-black mb-2"
            style={{ color: B.charcoal, fontFamily: 'Georgia, serif' }}
          >
            ¡Usuario creado!
          </h2>
          <p className="text-sm mb-1" style={{ color: B.charcoal }}>
            <span className="font-semibold">{form.nombre}</span> ya puede iniciar sesión.
          </p>
          <p className="text-xs mb-6" style={{ color: B.muted }}>
            {form.email} · Rol: {ROLES.find(r => r.value === form.rol)?.label}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setSuccess(false);
                setForm({ nombre: '', email: '', password: '', confirmPassword: '', rol: 'cajero', dni: '' });
                setError('');
              }}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: B.cream, color: B.charcoal, border: `2px solid ${B.creamDark}` }}
              onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
              onMouseLeave={e => e.currentTarget.style.background = B.cream}
            >
              Crear otro
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: B.charcoal, color: B.cream }}
              onMouseEnter={e => e.currentTarget.style.background = B.charcoalLight}
              onMouseLeave={e => e.currentTarget.style.background = B.charcoal}
            >
              Ir al sistema
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${B.charcoal} 0%, #1a2e24 50%, ${B.charcoal} 100%)` }}
    >
      {/* Decoración de fondo — idéntica al login */}
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
        {/* Header */}
        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: B.charcoal }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 24 C8 24 10 12 20 8 C20 8 22 18 12 24 Z" fill={B.green} />
              <path d="M16 22 C16 22 24 14 28 8 C28 8 20 6 16 14 Z" fill={B.gold} opacity="0.8" />
              <circle cx="16" cy="20" r="2" fill={B.cream} />
            </svg>
          </div>
          <p
            className="text-[11px] tracking-[0.4em] uppercase font-semibold mb-1"
            style={{ color: B.muted }}
          >
            Postres y Café
          </p>
          <h1
            className="text-3xl font-black tracking-[0.15em] uppercase"
            style={{ color: B.charcoal, fontFamily: 'Georgia, serif' }}
          >
            MADRE
          </h1>
          <p className="text-sm mt-2" style={{ color: B.muted }}>
            Registrar nuevo usuario · Solo administradores
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <Field label="Nombre completo">
            <Input
              value={form.nombre}
              onChange={set('nombre')}
              placeholder="Ej: María García"
              disabled={loading}
            />
          </Field>

          <Field label="Correo electrónico">
            <Input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="usuario@madre.com"
              disabled={loading}
            />
          </Field>

          <Field label="DNI (opcional)">
            <Input
              value={form.dni}
              onChange={v => { if (/^\d{0,8}$/.test(v)) set('dni')(v); }}
              placeholder="12345678"
              disabled={loading}
            />
          </Field>

          <Field label="Rol del usuario">
            <RolSelect
              value={form.rol}
              onChange={v => setForm(f => ({ ...f, rol: v }))}
              disabled={loading}
            />
          </Field>

          <Field label="Contraseña">
            <Input
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Mínimo 6 caracteres"
              disabled={loading}
              right={
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: B.muted }}
                  onMouseEnter={e => e.currentTarget.style.color = B.charcoal}
                  onMouseLeave={e => e.currentTarget.style.color = B.muted}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
          </Field>

          <Field label="Confirmar contraseña">
            <Input
              type={showConfirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              placeholder="Repite la contraseña"
              disabled={loading}
              right={
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: B.muted }}
                  onMouseEnter={e => e.currentTarget.style.color = B.charcoal}
                  onMouseLeave={e => e.currentTarget.style.color = B.muted}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            {/* Indicador de coincidencia en tiempo real */}
            {form.confirmPassword && (
              <p
                className="text-xs mt-1 flex items-center gap-1"
                style={{ color: form.password === form.confirmPassword ? B.green : B.terra }}
              >
                {form.password === form.confirmPassword
                  ? <><Check className="w-3 h-3" /> Las contraseñas coinciden</>
                  : '✗ Las contraseñas no coinciden'
                }
              </p>
            )}
          </Field>

          {/* Error */}
          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: '#fef0e6', color: B.terra, border: `1px solid ${B.terra}30` }}
            >
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push('/')}
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: B.cream,
                color:      B.charcoal,
                border:     `2px solid ${B.creamDark}`,
                cursor:     loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = B.creamDark; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = B.cream; }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl text-sm font-black tracking-wide transition-all flex items-center justify-center gap-2"
              style={{
                background: loading ? B.muted : B.charcoal,
                color:      B.cream,
                cursor:     loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = B.charcoalLight; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = B.charcoal; }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
                : 'Crear usuario'
              }
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-5 text-center">
          <p className="text-xs" style={{ color: B.muted }}>
            El usuario podrá iniciar sesión inmediatamente con estas credenciales.
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