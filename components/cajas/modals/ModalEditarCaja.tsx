// components/cajas/modals/ModalEditarCaja.tsx
'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { supabase } from '@/lib/supabase/client';
import { ZONAS_CAJA } from '@/constants/cajas/cajasConstants';
import type { Caja } from '@/lib/supabase/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface ModalEditarCajaProps {
  caja:     Caja;
  onClose:  () => void;
  onSaved:  () => void;
  usuarios: Array<{ id: string; nombre: string }>;
}

export function ModalEditarCaja({ caja, onClose, onSaved, usuarios }: ModalEditarCajaProps) {
  const [nombre,    setNombre]    = useState(caja.nombre);
  const [usuarioId, setUsuarioId] = useState(caja.usuario_id ?? '');
  const [zona,      setZona]      = useState(caja.zona ?? '');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleGuardar = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setLoading(true);
    setError('');
    try {
      const { error: err } = await db
        .from('cajas')
        .update({
          nombre:     nombre.trim(),
          usuario_id: usuarioId || null,
          zona:       zona      || null,
        })
        .eq('id', caja.id);
      if (err) throw err;
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    background: B.cream,
    border:     `1px solid ${B.creamDark}`,
    color:      B.charcoal,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-sm shadow-2xl"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: B.cream }}
        >
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>
            Editar · {caja.nombre}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: B.muted }}
            onMouseEnter={e => { e.currentTarget.style.background = B.cream; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          {/* Nombre */}
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inp}
            />
          </div>

          {/* Zona */}
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Zona
            </label>
            <select
              value={zona}
              onChange={e => setZona(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inp}
            >
              {ZONAS_CAJA.map(z => (
                <option key={z.value} value={z.value}>{z.label}</option>
              ))}
            </select>
          </div>

          {/* Usuario */}
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Usuario asignado
            </label>
            <select
              value={usuarioId}
              onChange={e => setUsuarioId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inp}
            >
              <option value="">Sin usuario asignado</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>

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
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold
                       flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}