// components/clientes/modals/ModalCliente.tsx
'use client';

import { useState } from 'react';
import { X, UserCircle, Building2, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { crearCliente, actualizarCliente } from '@/lib/supabase/queries';
import type { Cliente, TipoCliente } from '@/lib/supabase/types';

// ─── Tipos internos ──────────────────────────────────────────────────────────

interface FormState {
  tipo:      TipoCliente;
  nombre:    string;
  documento: string;
  telefono:  string;
  email:     string;
  direccion: string;
}

const FORM_VACIO: FormState = {
  tipo: 'persona', nombre: '', documento: '',
  telefono: '', email: '', direccion: '',
};

// ─── Campos del formulario ───────────────────────────────────────────────────

function camposForm(tipo: TipoCliente) {
  return [
    {
      key: 'nombre',
      label: tipo === 'persona' ? 'Nombre completo' : 'Razón social',
      ph:    tipo === 'persona' ? 'Juan Pérez'       : 'Mi Empresa SAC',
    },
    {
      key: 'documento',
      label: tipo === 'persona' ? 'DNI' : 'RUC',
      ph:    tipo === 'persona' ? '12345678' : '20123456789',
    },
    { key: 'telefono',  label: 'Teléfono',  ph: '987654321'         },
    { key: 'email',     label: 'Email',     ph: 'correo@ejemplo.com' },
    { key: 'direccion', label: 'Dirección', ph: 'Av. Principal 123'  },
  ] as const;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ModalClienteProps {
  cliente: Cliente | null;
  onClose: () => void;
  onSaved: (cliente?: Cliente) => void;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function ModalCliente({ cliente, onClose, onSaved }: ModalClienteProps) {
  const [form, setForm] = useState<FormState>(
    cliente
      ? {
          tipo:      cliente.tipo,
          nombre:    cliente.nombre,
          documento: cliente.dni ?? cliente.ruc ?? '',
          telefono:  cliente.telefono  ?? '',
          email:     cliente.email     ?? '',
          direccion: cliente.direccion ?? '',
        }
      : FORM_VACIO,
  );
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  // ── Guardar ──────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setGuardando(true);
    setError('');
    try {
      const payload = {
        tipo:      form.tipo,
        nombre:    form.nombre,
        dni:       form.tipo === 'persona' ? form.documento : null,
        ruc:       form.tipo === 'empresa' ? form.documento : null,
        telefono:  form.telefono  || null,
        email:     form.email     || null,
        direccion: form.direccion || null,
        activo:    true,
        fecha_nacimiento: null,
        dni_extranjero:   null,
      };
      const guardado = cliente
        ? await actualizarCliente(cliente.id, payload)
        : await crearCliente(payload);
      onSaved(guardado);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  // ── Estilos reutilizables ────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    background: B.cream,
    border: `1px solid ${B.creamDark}`,
    color: B.charcoal,
  };

  // ── Render ───────────────────────────────────────────────────────────────
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
            {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
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
          {/* Selector persona / empresa */}
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Tipo
            </label>
            <div className="flex gap-2">
              {(['persona', 'empresa'] as TipoCliente[]).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                  style={
                    form.tipo === t
                      ? { background: B.charcoal, color: B.cream }
                      : { background: B.cream,    color: B.charcoal }
                  }
                >
                  {t === 'persona'
                    ? <UserCircle className="w-4 h-4" />
                    : <Building2  className="w-4 h-4" />
                  }
                  {t === 'persona' ? 'Persona' : 'Empresa'}
                </button>
              ))}
            </div>
          </div>

          {/* Campos dinámicos */}
          {camposForm(form.tipo).map(({ key, label, ph }) => (
            <div key={key}>
              <label
                className="text-xs font-black uppercase tracking-wide block mb-1.5"
                style={{ color: B.muted }}
              >
                {label}
              </label>
              <input
                type="text"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inp}
              />
            </div>
          ))}

          {/* Error */}
          {error && (
            <p
              className="text-xs px-3 py-2 rounded-xl"
              style={{ background: '#fef0e6', color: B.terra }}
            >
              {error}
            </p>
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
            disabled={guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            {cliente ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}