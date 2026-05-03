'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, Star, Users, Building2, UserCircle, Edit, Trash2, X, TrendingUp } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, KpiCard, Btn } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
type TipoCliente = 'persona' | 'empresa';

interface Cliente {
  id: string;
  tipo: TipoCliente;
  nombre: string;
  documento: string;
  telefono: string;
  email: string;
  puntos: number;
  creado: string;
  activo: boolean;
}

interface FormState {
  tipo: TipoCliente;
  nombre: string;
  documento: string;
  telefono: string;
  email: string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_CLIENTES: Cliente[] = [
  { id:'1', tipo:'persona',  nombre:'Cliente General',  documento:'00000000',   telefono:'999999999', email:'',                          puntos:2.5,  creado:'21/02/2026', activo:true },
  { id:'2', tipo:'empresa',  nombre:'EMPRESA GENERAL',  documento:'00000000000',telefono:'-',          email:'',                          puntos:0,    creado:'26/02/2026', activo:true },
  { id:'3', tipo:'persona',  nombre:'Juan Pérez',        documento:'12345678',   telefono:'987654321', email:'juan@mail.com',             puntos:15.5, creado:'10/03/2026', activo:true },
  { id:'4', tipo:'persona',  nombre:'María García',      documento:'87654321',   telefono:'912345678', email:'maria@mail.com',            puntos:8.0,  creado:'15/03/2026', activo:true },
  { id:'5', tipo:'empresa',  nombre:'CAFETERÍA SALAS',   documento:'20123456789',telefono:'01-234567', email:'salas@empresa.com',         puntos:0,    creado:'20/03/2026', activo:true },
  { id:'6', tipo:'persona',  nombre:'Carlos Llanos',     documento:'45678912',   telefono:'956789012', email:'carlos@mail.com',           puntos:22.0, creado:'01/04/2026', activo:true },
];

// ─── Modal cliente ────────────────────────────────────────────────────────────
function ModalCliente({ cliente, onClose }: { cliente: Cliente | null; onClose: () => void }) {
  const [form, setForm] = useState<FormState>({
    tipo:      cliente?.tipo      ?? 'persona',
    nombre:    cliente?.nombre    ?? '',
    documento: cliente?.documento ?? '',
    telefono:  cliente?.telefono  ?? '',
    email:     cliente?.email     ?? '',
  });

  const inputStyle: React.CSSProperties = {
    background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl" style={{ background: B.white }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>
            {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tipo */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Tipo</label>
            <div className="flex gap-2">
              {(['persona', 'empresa'] as TipoCliente[]).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={form.tipo === t
                    ? { background: B.charcoal, color: B.cream }
                    : { background: B.cream, color: B.charcoal }
                  }>
                  {t === 'persona' ? <UserCircle className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  {t === 'persona' ? 'Persona' : 'Empresa'}
                </button>
              ))}
            </div>
          </div>

          {[
            { key: 'nombre',    label: form.tipo === 'persona' ? 'Nombre completo' : 'Razón social', placeholder: form.tipo === 'persona' ? 'Ej: Juan Pérez' : 'Ej: Mi Empresa SAC' },
            { key: 'documento', label: form.tipo === 'persona' ? 'DNI' : 'RUC',   placeholder: form.tipo === 'persona' ? '12345678' : '20123456789' },
            { key: 'telefono',  label: 'Teléfono',  placeholder: '987654321' },
            { key: 'email',     label: 'Email',     placeholder: 'correo@ejemplo.com' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>{label}</label>
              <input
                type={key === 'email' ? 'email' : 'text'}
                value={form[key as keyof FormState]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: B.green, color: B.cream }}>
            {cliente ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ClientesView() {
  const [busqueda, setBusqueda]     = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoCliente>('todos');
  const [modal, setModal]           = useState<{ open: boolean; cliente: Cliente | null }>({ open: false, cliente: null });

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return DEMO_CLIENTES.filter(c => {
      const matchQ    = !q || c.nombre.toLowerCase().includes(q) || c.documento.includes(q);
      const matchTipo = tipoFiltro === 'todos' || c.tipo === tipoFiltro;
      return matchQ && matchTipo;
    });
  }, [busqueda, tipoFiltro]);

  const personas  = DEMO_CLIENTES.filter(c => c.tipo === 'persona').length;
  const empresas  = DEMO_CLIENTES.filter(c => c.tipo === 'empresa').length;
  const conPuntos = DEMO_CLIENTES.filter(c => c.puntos > 0).length;

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`Gestiona tu base de clientes · Total: ${DEMO_CLIENTES.length}`}
        action={
          <Btn onClick={() => setModal({ open: true, cliente: null })}>
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </Btn>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total Clientes" value={DEMO_CLIENTES.length} icon={Users}     color={B.charcoal} />
        <KpiCard label="Personas"       value={personas}             sub={`${Math.round(personas/DEMO_CLIENTES.length*100)}%`} icon={UserCircle}  color={B.green} />
        <KpiCard label="Empresas"       value={empresas}             sub={`${Math.round(empresas/DEMO_CLIENTES.length*100)}%`} icon={Building2}   color={B.gold} />
        <KpiCard label="Con Puntos"     value={conPuntos}            icon={TrendingUp} color={B.terra} />
      </div>

      {/* Filtros */}
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

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Tipo', 'Nombre / Razón Social', 'DNI / RUC', 'Teléfono', 'Puntos', 'Fecha', 'Acciones'].map(h => (
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
                      : <Building2  className="w-4 h-4" style={{ color: B.gold }} />
                    }
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{c.nombre}</p>
                  <p className="text-xs capitalize" style={{ color: B.muted }}>{c.tipo}</p>
                </td>
                <td className="px-4 py-3 text-sm font-mono" style={{ color: B.charcoal }}>{c.documento}</td>
                <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>{c.telefono}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" style={{ color: B.gold }} />
                    <span className="text-sm font-bold" style={{ color: c.puntos > 0 ? B.gold : B.muted }}>
                      {c.puntos.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: B.muted }}>{c.creado}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal({ open: true, cliente: c })}
                      className="p-1.5 rounded-lg transition-colors" style={{ color: B.green }}
                      onMouseEnter={e => e.currentTarget.style.background = `${B.green}15`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg transition-colors" style={{ color: B.terra }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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

      {modal.open && <ModalCliente cliente={modal.cliente} onClose={() => setModal({ open: false, cliente: null })} />}
    </div>
  );
}