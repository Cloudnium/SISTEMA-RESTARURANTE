// components/usuarios/ModalUsuario.tsx
'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { supabase } from '@/lib/supabase/client';
import { ROL_CFG } from '@/constants/usuarios/constants';
import type { Usuario, RolUsuario } from '@/lib/supabase/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface FormState {
  nombre:   string;
  email:    string;
  password: string;
  rol:      RolUsuario;
  dni:      string;
  caja_id:  string;
  activo:   boolean;
}

const FORM_VACIO: FormState = {
  nombre: '', email: '', password: '',
  rol: 'cajero', dni: '', caja_id: '', activo: true,
};

interface CajaItem {
  id:     string;
  nombre: string;
}

interface ModalUsuarioProps {
  usuario: Usuario | null;
  cajas:   CajaItem[];
  onClose: () => void;
  onSaved: () => void;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function ModalUsuario({ usuario, cajas, onClose, onSaved }: ModalUsuarioProps) {
  const esNuevo = !usuario;

  const [form, setForm] = useState<FormState>(
    usuario
      ? {
          nombre:   usuario.nombre,
          email:    usuario.email,
          password: '',
          rol:      usuario.rol,
          dni:      usuario.dni      ?? '',
          caja_id:  usuario.caja_id  ?? '',
          activo:   usuario.activo,
        }
      : FORM_VACIO,
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // ── Validación ────────────────────────────────────────────────────────────
  const validar = (): string => {
    if (!form.nombre.trim())                               return 'El nombre es obligatorio';
    if (!form.email.trim())                                return 'El email es obligatorio';
    if (esNuevo && !form.password)                         return 'La contraseña es obligatoria';
    if (esNuevo && form.password.length < 6)               return 'La contraseña debe tener al menos 6 caracteres';
    if (!esNuevo && form.password && form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    return '';
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    const err = validar();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');
    try {
      if (esNuevo) {
        // Crear via API Route (necesita service_role para crear en Auth)
        const res  = await fetch('/api/usuarios', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            nombre:   form.nombre,
            email:    form.email,
            password: form.password,
            rol:      form.rol,
            dni:      form.dni     || null,
            caja_id:  form.caja_id || null,
            activo:   form.activo,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Error al crear el usuario');

      } else {
        // Editar perfil directo en tabla usuarios
        const { error: profileErr } = await db
          .from('usuarios')
          .update({
            nombre:  form.nombre,
            rol:     form.rol,
            dni:     form.dni     || null,
            caja_id: form.caja_id || null,
            activo:  form.activo,
          })
          .eq('id', usuario!.id);
        if (profileErr) throw profileErr;

        // Cambiar contraseña (opcional)
        if (form.password) {
          const res  = await fetch('/api/usuarios', {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId: usuario!.id, password: form.password }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Error al cambiar la contraseña');
        }
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // ── Estilos ───────────────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    background: B.cream,
    border:     `1px solid ${B.creamDark}`,
    color:      B.charcoal,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md shadow-2xl"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: B.cream }}
        >
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>
            {esNuevo ? 'Nuevo Usuario' : `Editar · ${usuario?.nombre}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: B.muted }}
            onMouseEnter={e => (e.currentTarget.style.background = B.cream)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          {/* Nombre */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
              Nombre completo *
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Chef Ana García"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inp}
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
              Correo electrónico *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="ana@restaurante.com"
              disabled={!esNuevo}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ ...inp, opacity: !esNuevo ? 0.6 : 1 }}
            />
            {!esNuevo && (
              <p className="text-[10px] mt-1" style={{ color: B.muted }}>
                El email no se puede cambiar
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
              Contraseña {!esNuevo && '(dejar vacío para no cambiar)'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={esNuevo ? 'Mínimo 6 caracteres' : '••••••••'}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inp}
            />
          </div>

          {/* Rol */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
              Rol
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(ROL_CFG) as [RolUsuario, typeof ROL_CFG[RolUsuario]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, rol: key }))}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all"
                  style={
                    form.rol === key
                      ? { background: cfg.color, color: B.cream, boxShadow: `0 2px 8px ${cfg.color}40` }
                      : { background: B.cream,   color: B.charcoal }
                  }
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* DNI + Caja */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
                DNI
              </label>
              <input
                type="text"
                value={form.dni}
                onChange={e => setForm(f => ({ ...f, dni: e.target.value }))}
                placeholder="12345678"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inp}
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
                Caja asignada
              </label>
              <select
                value={form.caja_id}
                onChange={e => setForm(f => ({ ...f, caja_id: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inp}
              >
                <option value="">Sin caja</option>
                {cajas.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle activo */}
          <div className="flex items-center gap-3 py-1">
            <button
              onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
              className="w-10 h-6 rounded-full transition-all relative shrink-0"
              style={{ background: form.activo ? B.green : B.muted }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: form.activo ? 'calc(100% - 22px)' : '2px' }}
              />
            </button>
            <span className="text-sm font-medium" style={{ color: B.charcoal }}>
              Usuario {form.activo ? 'activo' : 'inactivo'}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div
              className="px-3 py-2.5 rounded-xl text-xs"
              style={{ background: '#fef0e6', color: B.terra }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {esNuevo ? 'Crear usuario' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}