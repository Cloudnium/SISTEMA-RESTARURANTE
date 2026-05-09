// components/clientes/ClientesView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, Star, Users, Building2, UserCircle, Edit, Trash2, X, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { crearCliente, actualizarCliente, eliminarCliente } from '@/lib/supabase/queries';
import type { Cliente, TipoCliente } from '@/lib/supabase/types';

interface FormState {
  tipo: TipoCliente; nombre: string; documento: string;
  telefono: string; email: string; direccion: string;
}
const FORM_VACIO: FormState = { tipo: 'persona', nombre: '', documento: '', telefono: '', email: '', direccion: '' };

function ModalCliente({ cliente, onClose, onSaved }: {
  cliente: Cliente | null; onClose: () => void; onSaved: () => void;
}) {
  const [form,     setForm]     = useState<FormState>(cliente
    ? { tipo: cliente.tipo, nombre: cliente.nombre, documento: cliente.dni ?? cliente.ruc ?? '',
        telefono: cliente.telefono ?? '', email: cliente.email ?? '', direccion: cliente.direccion ?? '' }
    : FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setGuardando(true); setError('');
    try {
      const payload = {
        tipo: form.tipo, nombre: form.nombre,
        dni:  form.tipo === 'persona' ? form.documento : null,
        ruc:  form.tipo === 'empresa' ? form.documento : null,
        telefono: form.telefono || null, email: form.email || null,
        direccion: form.direccion || null, activo: true,
        fecha_nacimiento: null, dni_extranjero: null,
      };
      if (cliente) await actualizarCliente(cliente.id, payload);
      else await crearCliente(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const inp: React.CSSProperties = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>{cliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Tipo</label>
            <div className="flex gap-2">
              {(['persona', 'empresa'] as TipoCliente[]).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                  style={form.tipo === t ? { background: B.charcoal, color: B.cream } : { background: B.cream, color: B.charcoal }}>
                  {t === 'persona' ? <UserCircle className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  {t === 'persona' ? 'Persona' : 'Empresa'}
                </button>
              ))}
            </div>
          </div>
          {[
            { key: 'nombre',    label: form.tipo === 'persona' ? 'Nombre completo' : 'Razón social', ph: form.tipo === 'persona' ? 'Juan Pérez' : 'Mi Empresa SAC' },
            { key: 'documento', label: form.tipo === 'persona' ? 'DNI' : 'RUC', ph: form.tipo === 'persona' ? '12345678' : '20123456789' },
            { key: 'telefono',  label: 'Teléfono',  ph: '987654321' },
            { key: 'email',     label: 'Email',     ph: 'correo@ejemplo.com' },
            { key: 'direccion', label: 'Dirección', ph: 'Av. Principal 123' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>{label}</label>
              <input type="text" value={form[key as keyof FormState]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          ))}
          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}>
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {cliente ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientesView() {
  const { clientes, isLoading, refetchClientes } = useGlobalData();
  const [busqueda,   setBusqueda]   = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoCliente>('todos');
  const [modal,      setModal]      = useState<{ open: boolean; cliente: Cliente | null }>({ open: false, cliente: null });
  const [elimError,  setElimError]  = useState('');

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return clientes.filter(c => {
      const matchQ    = !q || c.nombre.toLowerCase().includes(q) || (c.dni ?? '').includes(q) || (c.ruc ?? '').includes(q);
      const matchTipo = tipoFiltro === 'todos' || c.tipo === tipoFiltro;
      return matchQ && matchTipo;
    });
  }, [clientes, busqueda, tipoFiltro]);

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Desactivar este cliente? Podrá reactivarlo editándolo.')) return;
    setElimError('');
    try {
      await eliminarCliente(id);
      refetchClientes();
    } catch (e) {
      setElimError(e instanceof Error ? e.message : 'Error al desactivar el cliente');
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  const personas = clientes.filter(c => c.tipo === 'persona').length;
  const empresas = clientes.filter(c => c.tipo === 'empresa').length;

  return (
    <div>
      <PageHeader title="Clientes" subtitle={`Base de clientes · Total: ${clientes.length}`}
        action={<Btn onClick={() => setModal({ open: true, cliente: null })}><Plus className="w-4 h-4" />Nuevo Cliente</Btn>} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total"      value={clientes.length}                                         icon={Users}      color={B.charcoal} />
        <KpiCard label="Personas"   value={personas}                                                icon={UserCircle} color={B.green}    />
        <KpiCard label="Empresas"   value={empresas}                                                icon={Building2}  color={B.gold}     />
        <KpiCard label="Con Puntos" value={clientes.filter(c => c.puntos_acumulados > 0).length}   icon={TrendingUp} color={B.terra}    />
      </div>

      {/* Error global de eliminación */}
      {elimError && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4"
          style={{ background: '#fef0e6', border: `1px solid ${B.terra}30` }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: B.terra }} />
          <p className="text-sm" style={{ color: B.terra }}>{elimError}</p>
          <button onClick={() => setElimError('')} className="ml-auto p-0.5 rounded" style={{ color: B.terra }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, RUC, DNI..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
          </div>
          <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value as typeof tipoFiltro)}
            className="px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }}>
            <option value="todos">Todos</option>
            <option value="persona">Personas</option>
            <option value="empresa">Empresas</option>
          </select>
        </div>
      </Card>

      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Tipo', 'Nombre', 'DNI / RUC', 'Teléfono', 'Puntos', 'Fecha', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest" style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr key={c.id} style={{ borderTop: `1px solid ${B.cream}` }}
                onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="px-4 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: c.tipo === 'persona' ? `${B.green}18` : `${B.gold}18` }}>
                    {c.tipo === 'persona'
                      ? <UserCircle className="w-4 h-4" style={{ color: B.green }} />
                      : <Building2  className="w-4 h-4" style={{ color: B.gold }} />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{c.nombre}</p>
                  <p className="text-xs capitalize" style={{ color: B.muted }}>{c.tipo}</p>
                </td>
                <td className="px-4 py-3 text-sm font-mono" style={{ color: B.charcoal }}>{c.dni ?? c.ruc ?? '-'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{c.telefono ?? '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" style={{ color: B.gold }} />
                    <span className="text-sm font-bold" style={{ color: c.puntos_acumulados > 0 ? B.gold : B.muted }}>
                      {c.puntos_acumulados.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: B.muted }}>
                  {new Date(c.created_at).toLocaleDateString('es-PE')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal({ open: true, cliente: c })}
                      className="p-1.5 rounded-lg" style={{ color: B.green }}
                      onMouseEnter={e => e.currentTarget.style.background = `${B.green}15`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEliminar(c.id)}
                      className="p-1.5 rounded-lg" style={{ color: B.terra }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      title="Desactivar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>No se encontraron clientes</div>
        )}
      </div>

      {modal.open && (
        <ModalCliente cliente={modal.cliente}
          onClose={() => setModal({ open: false, cliente: null })}
          onSaved={() => { setModal({ open: false, cliente: null }); refetchClientes(); }} />
      )}
    </div>
  );
}
