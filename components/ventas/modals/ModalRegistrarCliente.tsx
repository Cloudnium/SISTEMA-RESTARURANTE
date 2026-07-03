/* components/ventas/modals/ModalRegistrarCliente.tsx
'use client';

import React, { useState } from 'react';
import { X, Loader2, UserCircle, Building2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { crearCliente } from '@/lib/supabase/queries';
import { FORM_CLI_VACIO, type FormCliente, type TipoClienteLocal } from '@/utils/ventas/ventasUtils';
import type { Cliente, TipoComprobante } from '@/lib/supabase/types';

interface ModalRegistrarClienteProps {
  tipoComprobante: TipoComprobante;
  onClose:         () => void;
  onRegistrado:    (c: Cliente) => void;
}

export function ModalRegistrarCliente({
  tipoComprobante, onClose, onRegistrado,
}: ModalRegistrarClienteProps) {
  const tipoForzado: TipoClienteLocal = tipoComprobante === 'factura' ? 'empresa' : 'persona';

  const [form,      setForm]      = useState<FormCliente>({ ...FORM_CLI_VACIO, tipo: tipoForzado });
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const inp: React.CSSProperties = {
    background: B.cream,
    border:     `1px solid ${B.creamDark}`,
    color:      B.charcoal,
  };

  const campos: { key: keyof FormCliente; label: string; ph: string }[] = [
    {
      key:   'nombre',
      label: form.tipo === 'persona' ? 'Nombre completo' : 'Razón social',
      ph:    form.tipo === 'persona' ? 'Juan Pérez'       : 'Mi Empresa SAC',
    },
    {
      key:   'documento',
      label: form.tipo === 'persona' ? 'DNI' : 'RUC',
      ph:    form.tipo === 'persona' ? '12345678' : '20123456789',
    },
    { key: 'telefono',  label: 'Teléfono',  ph: '987654321'         },
    { key: 'email',     label: 'Email',     ph: 'correo@ejemplo.com' },
    { key: 'direccion', label: 'Dirección', ph: 'Av. Principal 123'  },
  ];

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (tipoComprobante === 'factura' && !form.documento.trim()) {
      setError('El RUC es obligatorio para factura'); return;
    }
    setGuardando(true);
    setError('');
    try {
      const nuevo = await crearCliente({
        tipo:             form.tipo,
        nombre:           form.nombre.trim(),
        dni:              form.tipo === 'persona' ? (form.documento.trim() || null) : null,
        ruc:              form.tipo === 'empresa' ? (form.documento.trim() || null) : null,
        telefono:         form.telefono.trim()  || null,
        email:            form.email.trim()     || null,
        direccion:        form.direccion.trim() || null,
        fecha_nacimiento: null,
        activo:           true,
        dni_extranjero:   null,
      });
      onRegistrado(nuevo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar cliente');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4"
      style={{ background: 'rgba(20,20,30,0.75)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md shadow-2xl"
        style={{ background: B.white }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header 
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: B.cream }}
        >
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>
            {tipoForzado === 'empresa' ? 'Registrar Empresa' : 'Registrar Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: B.muted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = B.cream)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body 
        <div className="p-6 space-y-3">
          {/* Tipo persona / empresa 
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Tipo
            </label>
            <div className="flex gap-2">
              {(['persona', 'empresa'] as TipoClienteLocal[]).map((t) => {
                const bloqueado = tipoComprobante === 'factura';
                const activo    = form.tipo === t;
                return (
                  <button
                    key={t}
                    onClick={() => { if (!bloqueado) setForm((f) => ({ ...f, tipo: t })); }}
                    disabled={bloqueado && !activo}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                    style={
                      activo
                        ? { background: B.charcoal, color: B.cream }
                        : { background: B.cream, color: B.charcoal, opacity: bloqueado ? 0.4 : 1 }
                    }
                  >
                    {t === 'persona' ? (
                      <UserCircle className="w-4 h-4" />
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                    {t === 'persona' ? 'Persona' : 'Empresa'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campos 
          {campos.map(({ key, label, ph }) => (
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
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={ph}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inp}
              />
            </div>
          ))}

          {error && (
            <p
              className="text-xs px-3 py-2 rounded-xl"
              style={{ background: '#fef0e6', color: B.terra }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Footer 
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
            {tipoForzado === 'empresa' ? 'Registrar empresa' : 'Registrar cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}*/