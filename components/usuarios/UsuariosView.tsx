// components/usuarios/UsuariosView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Edit, Trash2, Loader2, X,
  UserCircle, Shield, CreditCard, ChefHat, AlertTriangle,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { supabase } from '@/lib/supabase/client';
import type { Usuario, RolUsuario } from '@/lib/supabase/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type EstadoFiltro = 'todos' | 'activo' | 'inactivo';
type RolFiltro   = 'todos' | RolUsuario;

interface FormState {
  nombre: string; email: string; password: string;
  rol: RolUsuario; dni: string; caja_id: string; activo: boolean;
}

const FORM_VACIO: FormState = {
  nombre: '', email: '', password: '', rol: 'cajero',
  dni: '', caja_id: '', activo: true,
};

const ROL_CFG: Record<RolUsuario, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  admin:    { label: 'Administrador', color: B.gold,  bg: `${B.gold}18`,  icon: <Shield     className="w-4 h-4" /> },
  cajero:   { label: 'Cajero',        color: B.green, bg: `${B.green}18`, icon: <CreditCard className="w-4 h-4" /> },
  cocinero: { label: 'Cocinero',      color: B.terra, bg: `${B.terra}18`, icon: <ChefHat    className="w-4 h-4" /> },
};

// ─── Modal Confirmar eliminación ──────────────────────────────────────────────
function ModalConfirmarEliminar({ usuario, onClose, onDesactivar, onEliminar, loading }: {
  usuario: Usuario;
  onClose:      () => void;
  onDesactivar: () => Promise<void>;
  onEliminar:   () => Promise<void>;
  loading:      boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={!loading ? onClose : undefined}>
      <div className="rounded-2xl w-full max-w-sm shadow-2xl" style={{ background: B.white }}
        onClick={e => e.stopPropagation()}>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#fee2e2' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: B.terra }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: B.charcoal }}>¿Qué deseas hacer?</h2>
              <p className="text-xs mt-0.5" style={{ color: B.muted }}>{usuario.nombre} · {usuario.email}</p>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            {/* Opción 1: Desactivar */}
            <button onClick={onDesactivar} disabled={loading}
              className="w-full text-left px-4 py-3 rounded-xl transition-all"
              style={{ background: `${B.gold}12`, border: `1px solid ${B.gold}30` }}
              onMouseEnter={e => e.currentTarget.style.background = `${B.gold}20`}
              onMouseLeave={e => e.currentTarget.style.background = `${B.gold}12`}>
              <p className="text-sm font-bold" style={{ color: B.charcoal }}>Desactivar usuario</p>
              <p className="text-xs mt-0.5" style={{ color: B.muted }}>
                El usuario no podrá iniciar sesión pero sus datos se conservan. Reversible.
              </p>
            </button>

            {/* Opción 2: Eliminar permanente */}
            <button onClick={onEliminar} disabled={loading}
              className="w-full text-left px-4 py-3 rounded-xl transition-all"
              style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
              onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold" style={{ color: B.terra }}>Eliminar permanentemente</p>
                  <p className="text-xs mt-0.5" style={{ color: B.muted }}>
                    Elimina el usuario de Auth y la base de datos. Irreversible.
                  </p>
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0 ml-2" style={{ color: B.terra }} />}
              </div>
            </button>
          </div>

          <button onClick={onClose} disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Usuario (crear / editar) ──────────────────────────────────────────
function ModalUsuario({ usuario, cajas, onClose, onSaved }: {
  usuario: Usuario | null;
  cajas:   Array<{ id: string; nombre: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const esNuevo = !usuario;
  const [form,    setForm]    = useState<FormState>(usuario
    ? { nombre: usuario.nombre, email: usuario.email, password: '',
        rol: usuario.rol, dni: usuario.dni ?? '', caja_id: usuario.caja_id ?? '',
        activo: usuario.activo }
    : FORM_VACIO);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const inp: React.CSSProperties = {
    background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim())                    { setError('El nombre es obligatorio'); return; }
    if (!form.email.trim())                     { setError('El email es obligatorio'); return; }
    if (esNuevo && !form.password)              { setError('La contraseña es obligatoria'); return; }
    if (esNuevo && form.password.length < 6)   { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (!esNuevo && form.password && form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres'); return;
    }

    setLoading(true); setError('');
    try {
      if (esNuevo) {
        const res = await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: form.nombre, email: form.email, password: form.password,
            rol: form.rol, dni: form.dni || null, caja_id: form.caja_id || null, activo: form.activo,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Error al crear el usuario');

      } else {
        const { error: profileErr } = await db.from('usuarios').update({
          nombre: form.nombre, rol: form.rol,
          dni: form.dni || null, caja_id: form.caja_id || null, activo: form.activo,
        }).eq('id', usuario!.id);
        if (profileErr) throw profileErr;

        if (form.password) {
          const res = await fetch('/api/usuarios', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: usuario!.id, password: form.password }),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>
            {esNuevo ? 'Nuevo Usuario' : `Editar · ${usuario?.nombre}`}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {/* Nombre */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Nombre completo *</label>
            <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Chef Ana García" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Correo electrónico *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="ana@madre.com" disabled={!esNuevo}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ ...inp, opacity: !esNuevo ? 0.6 : 1 }} />
            {!esNuevo && <p className="text-[10px] mt-1" style={{ color: B.muted }}>El email no se puede cambiar</p>}
          </div>

          {/* Contraseña */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
              Contraseña {!esNuevo && '(dejar vacío para no cambiar)'}
            </label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={esNuevo ? 'Mínimo 6 caracteres' : '••••••••'}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>

          {/* Rol */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Rol</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(ROL_CFG) as [RolUsuario, typeof ROL_CFG[RolUsuario]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, rol: key }))}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all"
                  style={form.rol === key
                    ? { background: cfg.color, color: B.cream, boxShadow: `0 2px 8px ${cfg.color}40` }
                    : { background: B.cream, color: B.charcoal }}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* DNI + Caja */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>DNI</label>
              <input type="text" value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))}
                placeholder="12345678" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Caja asignada</label>
              <select value={form.caja_id} onChange={e => setForm(f => ({ ...f, caja_id: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
                <option value="">Sin caja</option>
                {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Activo toggle */}
          <div className="flex items-center gap-3 py-1">
            <button onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
              className="w-10 h-6 rounded-full transition-all relative shrink-0"
              style={{ background: form.activo ? B.green : B.muted }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: form.activo ? 'calc(100% - 22px)' : '2px' }} />
            </button>
            <span className="text-sm font-medium" style={{ color: B.charcoal }}>
              Usuario {form.activo ? 'activo' : 'inactivo'}
            </span>
          </div>

          {error && (
            <div className="px-3 py-2.5 rounded-xl text-xs" style={{ background: '#fef0e6', color: B.terra }}>
              {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {esNuevo ? 'Crear usuario' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function UsuariosView() {
  const { usuarios, cajas, isLoading, refetchUsuarios } = useGlobalData();

  const [busqueda,  setBusqueda]  = useState('');
  const [rolFiltro, setRolFiltro] = useState<RolFiltro>('todos');
  const [estadoF,   setEstadoF]   = useState<EstadoFiltro>('todos');
  const [modal,     setModal]     = useState<{ open: boolean; usuario: Usuario | null }>({ open: false, usuario: null });
  const [modalElim, setModalElim] = useState<Usuario | null>(null);
  const [elimLoading, setElimLoading] = useState(false);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return usuarios.filter(u => {
      const matchQ      = !q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.dni ?? '').includes(q);
      const matchRol    = rolFiltro === 'todos' || u.rol === rolFiltro;
      const matchEstado = estadoF === 'todos' || (estadoF === 'activo' ? u.activo : !u.activo);
      return matchQ && matchRol && matchEstado;
    });
  }, [usuarios, busqueda, rolFiltro, estadoF]);

  // Desactivar — solo marca activo=false en la tabla, el usuario sigue en Auth
  const handleDesactivar = async () => {
    if (!modalElim) return;
    setElimLoading(true);
    try {
      await db.from('usuarios').update({ activo: false }).eq('id', modalElim.id);
      setModalElim(null);
      refetchUsuarios();
    } catch (e) {
      console.error('Error al desactivar:', e);
    } finally {
      setElimLoading(false);
    }
  };

  // Eliminar permanente — llama a DELETE /api/usuarios/:id (usa service_role en el servidor)
  const handleEliminarPermanente = async () => {
    if (!modalElim) return;
    setElimLoading(true);
    try {
      const res = await fetch(`/api/usuarios/${modalElim.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al eliminar');
      setModalElim(null);
      refetchUsuarios();
    } catch (e) {
      console.error('Error al eliminar:', e);
      alert(e instanceof Error ? e.message : 'Error al eliminar el usuario');
    } finally {
      setElimLoading(false);
    }
  };

  const cajasList = cajas.map(c => ({ id: c.id, nombre: c.nombre }));

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Gestión de Usuarios"
        subtitle={`Administra el equipo del restaurante · Total: ${usuarios.length}`}
        action={
          <Btn onClick={() => setModal({ open: true, usuario: null })}>
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </Btn>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {(Object.entries(ROL_CFG) as [RolUsuario, typeof ROL_CFG[RolUsuario]][]).map(([rol, cfg]) => (
          <KpiCard key={rol} label={cfg.label} value={usuarios.filter(u => u.rol === rol).length}
            icon={rol === 'admin' ? Shield : rol === 'cajero' ? CreditCard : ChefHat} color={cfg.color} />
        ))}
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, email o DNI..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
          </div>
          <select value={rolFiltro} onChange={e => setRolFiltro(e.target.value as RolFiltro)}
            className="px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}>
            <option value="todos">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="cajero">Cajero</option>
            <option value="cocinero">Cocinero</option>
          </select>
          <select value={estadoF} onChange={e => setEstadoF(e.target.value as EstadoFiltro)}
            className="px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}>
            <option value="todos">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
      </Card>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Usuario', 'Email', 'Rol', 'DNI', 'Caja', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
                  style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(u => {
              const rolCfg = ROL_CFG[u.rol];
              return (
                <tr key={u.id} style={{ borderTop: `1px solid ${B.cream}` }}
                  onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: rolCfg.bg }}>
                        <UserCircle className="w-4 h-4" style={{ color: rolCfg.color }} />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: B.charcoal }}>{u.nombre}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm" style={{ color: B.muted }}>{u.email}</td>

                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: rolCfg.bg, color: rolCfg.color }}>
                      {rolCfg.label}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm font-mono" style={{ color: B.charcoal }}>{u.dni ?? '-'}</td>

                  <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>
                    {u.caja?.nombre ?? '-'}
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={u.activo ? { background: '#e8f5e2', color: B.green } : { background: '#fee2e2', color: B.terra }}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ open: true, usuario: u })}
                        className="p-1.5 rounded-lg" style={{ color: B.green }}
                        onMouseEnter={e => e.currentTarget.style.background = `${B.green}15`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setModalElim(u)}
                        className="p-1.5 rounded-lg" style={{ color: B.terra }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Eliminar / Desactivar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
            {usuarios.length === 0 ? 'Sin usuarios registrados' : 'No hay resultados para los filtros aplicados'}
          </div>
        )}
      </div>

      {/* Modal editar/crear */}
      {modal.open && (
        <ModalUsuario usuario={modal.usuario} cajas={cajasList}
          onClose={() => setModal({ open: false, usuario: null })}
          onSaved={() => { setModal({ open: false, usuario: null }); refetchUsuarios(); }} />
      )}

      {/* Modal confirmar eliminación */}
      {modalElim && (
        <ModalConfirmarEliminar
          usuario={modalElim}
          loading={elimLoading}
          onClose={() => !elimLoading && setModalElim(null)}
          onDesactivar={handleDesactivar}
          onEliminar={handleEliminarPermanente}
        />
      )}
    </div>
  );
}
