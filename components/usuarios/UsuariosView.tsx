// componentes/usuarios/UsuariosView.tsx
'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus, Edit, X, CreditCard, Search, Trash2,
  UserCircle, Shield, ChefHat, Loader2,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, KpiCard, Btn, Card } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { crearUsuario, actualizarUsuario, desactivarUsuario } from '@/lib/supabase/queries';
import type { Usuario, RolUsuario } from '@/lib/supabase/types';

function inputCls(extra = '') {
  return `w-full px-3 py-2.5 rounded-xl text-sm outline-none ${extra}`;
}
const INP: React.CSSProperties = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };

function ModalBase({ title, onClose, children, actions }: {
  title: string; onClose: () => void;
  children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {actions && <div className="px-6 pb-6 flex gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

const ROL_CONFIG: Record<RolUsuario, { label: string; bg: string; color: string }> = {
  admin:    { label: 'Administrador', bg: `${B.gold}18`,  color: B.gold },
  cajero:   { label: 'Cajero',        bg: `${B.green}18`, color: B.green },
  cocinero: { label: 'Cocinero',      bg: `${B.terra}18`, color: B.terra },
};

interface FormState {
  nombre: string; email: string; rol: RolUsuario; dni: string;
}
const FORM_VACIO: FormState = { nombre: '', email: '', rol: 'cajero', dni: '' };

function ModalUsuario({ usuario, onClose, onSaved }: {
  usuario: Usuario | null; onClose: () => void; onSaved: () => void;
}) {
  const [form,     setForm]     = useState<FormState>(usuario
    ? { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, dni: usuario.dni ?? '' }
    : FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const handleGuardar = async () => {
    if (!form.nombre.trim() || !form.email.trim()) { setError('Nombre y email son obligatorios'); return; }
    setGuardando(true); setError('');
    try {
      const payload = {
        nombre: form.nombre, email: form.email,
        rol: form.rol, dni: form.dni || null,
      };
      if (usuario) await actualizarUsuario(usuario.id, payload);
      else await crearUsuario(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalBase title={usuario ? 'Editar Usuario' : 'Nuevo Usuario'} onClose={onClose}
      actions={<>
        <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal }} onClick={onClose}>Cancelar</button>
        <button onClick={handleGuardar} disabled={guardando}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: B.green, color: B.cream }}>
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          {usuario ? 'Guardar' : 'Crear'}
        </button>
      </>}>
      <div className="space-y-3">
        {([
          { key: 'nombre', label: 'Nombre',    ph: 'Chef Ana', type: 'text' },
          { key: 'email',  label: 'Email',     ph: 'chef@madre.com', type: 'email' },
          { key: 'dni',    label: 'DNI',       ph: '12345678', type: 'text' },
        ] as { key: keyof FormState; label: string; ph: string; type: string }[]).map(({ key, label, ph, type }) => (
          <div key={key}>
            <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>{label}</label>
            <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={ph} className={inputCls()} style={INP} />
          </div>
        ))}
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Rol</label>
          <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value as RolUsuario }))}
            className={inputCls()} style={INP}>
            <option value="admin">Administrador</option>
            <option value="cajero">Cajero</option>
            <option value="cocinero">Cocinero</option>
          </select>
        </div>
        {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
      </div>
    </ModalBase>
  );
}

export function UsuariosView() {
  const { usuarios, isLoading, refetchUsuarios } = useGlobalData();
  const [busqueda,  setBusqueda]  = useState('');
  const [rolFiltro, setRolFiltro] = useState<'todos' | RolUsuario>('todos');
  const [modal,     setModal]     = useState<{ open: boolean; usuario: Usuario | null }>({ open: false, usuario: null });

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return usuarios.filter(u => {
      const matchQ   = !q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRol = rolFiltro === 'todos' || u.rol === rolFiltro;
      return matchQ && matchRol;
    });
  }, [usuarios, busqueda, rolFiltro]);

  const handleDesactivar = async (id: string) => {
    if (!confirm('¿Desactivar este usuario?')) return;
    await desactivarUsuario(id);
    refetchUsuarios();
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Gestión de Usuarios"
        subtitle={`Administra cajeros, cocineros y administradores · Total: ${usuarios.length}`}
        action={<Btn onClick={() => setModal({ open: true, usuario: null })}><Plus className="w-4 h-4" />Nuevo Usuario</Btn>}
      />

      <div className="grid grid-cols-3 gap-4 mb-5">
        {(['admin', 'cajero', 'cocinero'] as RolUsuario[]).map(r => (
          <KpiCard key={r} label={ROL_CONFIG[r].label}
            value={usuarios.filter(u => u.rol === r).length}
            icon={r === 'admin' ? Shield : r === 'cajero' ? CreditCard : ChefHat}
            color={ROL_CONFIG[r].color} />
        ))}
      </div>

      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, email o DNI..."
              className={inputCls('pl-9')} style={INP} />
          </div>
          <select value={rolFiltro} onChange={e => setRolFiltro(e.target.value as typeof rolFiltro)}
            className="px-4 py-2.5 rounded-xl text-sm outline-none" style={INP}>
            <option value="todos">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="cajero">Cajero</option>
            <option value="cocinero">Cocinero</option>
          </select>
        </div>
      </Card>

      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Nombre', 'Email', 'Rol', 'DNI', 'Caja', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(u => {
              const rolCfg = ROL_CONFIG[u.rol];
              return (
                <tr key={u.id} style={{ borderTop: `1px solid ${B.cream}` }}
                  onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
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
                    {(u.caja as { nombre?: string } | null)?.nombre ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={u.activo
                        ? { background: '#e8f5e2', color: B.green }
                        : { background: '#fee2e2', color: B.terra }}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ open: true, usuario: u })}
                        className="p-1.5 rounded-lg" style={{ color: B.green }}
                        onMouseEnter={e => e.currentTarget.style.background = `${B.green}15`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDesactivar(u.id)}
                        className="p-1.5 rounded-lg" style={{ color: B.terra }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>No se encontraron usuarios</div>
        )}
      </div>

      {modal.open && (
        <ModalUsuario usuario={modal.usuario} onClose={() => setModal({ open: false, usuario: null })}
          onSaved={() => { setModal({ open: false, usuario: null }); refetchUsuarios(); }} />
      )}
    </div>
  );
}