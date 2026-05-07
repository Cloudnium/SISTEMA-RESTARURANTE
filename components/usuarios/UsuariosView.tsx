// componentes/usuarios/UsuariosView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Edit, Trash2, Loader2, X,
  UserCircle, Shield, CreditCard, ChefHat,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { supabase } from '@/lib/supabase/client';
import type { Usuario, RolUsuario } from '@/lib/supabase/types';

// ─── cliente con tipado relajado (igual que en queries/index.ts) ──────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Tipos ────────────────────────────────────────────────────────────────────
type EstadoFiltro = 'todos' | 'activo' | 'inactivo';
type RolFiltro   = 'todos' | RolUsuario;

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
  nombre: '', email: '', password: '', rol: 'cajero',
  dni: '', caja_id: '', activo: true,
};

// ─── Config visual por rol ────────────────────────────────────────────────────
const ROL_CFG: Record<RolUsuario, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  admin:    { label: 'Administrador', color: B.gold,  bg: `${B.gold}18`,  icon: <Shield     className="w-4 h-4" /> },
  cajero:   { label: 'Cajero',        color: B.green, bg: `${B.green}18`, icon: <CreditCard className="w-4 h-4" /> },
  cocinero: { label: 'Cocinero',      color: B.terra, bg: `${B.terra}18`, icon: <ChefHat    className="w-4 h-4" /> },
};

// ─── Modal Usuario ────────────────────────────────────────────────────────────
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
    : FORM_VACIO
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const inp: React.CSSProperties = {
    background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim())           { setError('El nombre es obligatorio'); return; }
    if (!form.email.trim())            { setError('El email es obligatorio'); return; }
    if (esNuevo && !form.password)     { setError('La contraseña es obligatoria para usuarios nuevos'); return; }
    if (esNuevo && form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }

    setLoading(true); setError('');

    try {
      if (esNuevo) {
        // 1. Crear en Supabase Auth con signUp (disponible en cliente)
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email:    form.email,
          password: form.password,
          options: {
            data: { nombre: form.nombre, rol: form.rol },
          },
        });
        if (authErr) throw authErr;
        if (!authData.user) throw new Error('No se pudo crear el usuario en Auth.');

        // 2. El trigger de Supabase crea la fila en `usuarios`.
        //    Esperamos brevemente para que el trigger se ejecute y luego actualizamos el perfil.
        await new Promise(r => setTimeout(r, 800));

        const { error: profileErr } = await db
          .from('usuarios')
          .update({
            nombre:  form.nombre,
            rol:     form.rol,
            dni:     form.dni     || null,
            caja_id: form.caja_id || null,
            activo:  form.activo,
          })
          .eq('id', authData.user.id);
        if (profileErr) throw profileErr;

      } else {
        // Actualizar perfil existente
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

        // Cambiar contraseña sólo si el admin ingresó una nueva
        // Nota: updateUser sólo puede cambiar la contraseña del usuario en sesión actual.
        // Para cambiar la de otro usuario desde el cliente no es posible sin service_role.
        // Se muestra aviso informativo si se intenta.
        if (form.password) {
          setError('ℹ️ Para cambiar la contraseña de otro usuario, hacelo desde Supabase Dashboard → Authentication → Users.');
          setLoading(false);
          return;
        }
      }

      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ... resto del JSX igual que el original (no cambia nada visual)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>

        {/* Header */}
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
            <input type="text" value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Chef Ana García"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
              Correo electrónico *
            </label>
            <input type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="ana@madre.com" disabled={!esNuevo}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ ...inp, opacity: !esNuevo ? 0.6 : 1 }} />
            {!esNuevo && (
              <p className="text-[10px] mt-1" style={{ color: B.muted }}>
                El email no se puede cambiar una vez creado
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
              Contraseña {!esNuevo && '(dejar en blanco para no cambiar)'}
            </label>
            <input type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
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
                    : { background: B.cream, color: B.charcoal }
                  }>
                  {cfg.icon}
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* DNI + Caja */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>DNI</label>
              <input type="text" value={form.dni}
                onChange={e => setForm(f => ({ ...f, dni: e.target.value }))}
                placeholder="12345678"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Caja asignada</label>
              <select value={form.caja_id}
                onChange={e => setForm(f => ({ ...f, caja_id: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
                <option value="">Sin caja</option>
                {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3 py-1">
            <button
              onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
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
  const [modal, setModal] = useState<{ open: boolean; usuario: Usuario | null }>({
    open: false, usuario: null,
  });

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return usuarios.filter(u => {
      const matchQ      = !q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.dni ?? '').includes(q);
      const matchRol    = rolFiltro === 'todos' || u.rol === rolFiltro;
      const matchEstado = estadoF === 'todos' || (estadoF === 'activo' ? u.activo : !u.activo);
      return matchQ && matchRol && matchEstado;
    });
  }, [usuarios, busqueda, rolFiltro, estadoF]);

  const handleEliminar = async (u: Usuario) => {
    if (!confirm(`¿Desactivar a ${u.nombre}? No se eliminará de Auth.`)) return;
    await supabase.from('usuarios').update({ activo: false }).eq('id', u.id);
    refetchUsuarios();
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
          <KpiCard
            key={rol}
            label={cfg.label}
            value={usuarios.filter(u => u.rol === rol).length}
            icon={rol === 'admin' ? Shield : rol === 'cajero' ? CreditCard : ChefHat}
            color={cfg.color}
          />
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

                  {/* Avatar + nombre */}
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

                  {/* Rol badge */}
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: rolCfg.bg, color: rolCfg.color }}>
                      {rolCfg.label}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm font-mono" style={{ color: B.charcoal }}>
                    {u.dni ?? '-'}
                  </td>

                  <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>
                    {(u as Usuario & { caja?: { nombre: string } | null }).caja?.nombre ?? '-'}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={u.activo
                        ? { background: '#e8f5e2', color: B.green }
                        : { background: '#fee2e2', color: B.terra }
                      }>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ open: true, usuario: u })}
                        className="p-1.5 rounded-lg transition-colors" style={{ color: B.green }}
                        onMouseEnter={e => e.currentTarget.style.background = `${B.green}15`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEliminar(u)}
                        className="p-1.5 rounded-lg transition-colors" style={{ color: B.terra }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Desactivar">
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

      {/* Modal */}
      {modal.open && (
        <ModalUsuario
          usuario={modal.usuario}
          cajas={cajasList}
          onClose={() => setModal({ open: false, usuario: null })}
          onSaved={() => { setModal({ open: false, usuario: null }); refetchUsuarios(); }}
        />
      )}
    </div>
  );
}