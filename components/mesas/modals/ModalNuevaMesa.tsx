// components/mesas/modals/ModalNuevaMesa.tsx
'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { crearMesa } from '@/lib/supabase/queries';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function ModalNuevaMesa({ onClose, onSaved }: Props) {
  const [numero,    setNumero]    = useState('');
  const [nombre,    setNombre]    = useState('');
  const [zona,      setZona]      = useState('');
  const [capacidad, setCapacidad] = useState('4');
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const inp: React.CSSProperties = {
    background: B.cream,
    border: `1px solid ${B.creamDark}`,
    color: B.charcoal,
  };

  const handleGuardar = async () => {
    if (!numero.trim() || !zona.trim()) {
      setError('Número y zona son obligatorios');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await crearMesa({
        numero:    numero.trim(),
        nombre:    nombre.trim() || `Mesa ${numero.trim()}`,
        zona:      zona.trim(),
        capacidad: parseInt(capacidad) || 4,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);


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
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Nueva Mesa</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          {[
            { label: 'Número / ID',         val: numero,    set: setNumero,    ph: 'M01, T02, B03...' },
            { label: 'Nombre (opcional)',    val: nombre,    set: setNombre,    ph: 'Mesa 1, Mesa Terraza...' },
            { label: 'Zona',                val: zona,      set: setZona,      ph: 'Salón Principal, Terraza, Barra...' },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label
                className="text-xs font-black uppercase tracking-wide block mb-1.5"
                style={{ color: B.muted }}
              >
                {label}
              </label>
              <input
                type="text"
                value={val}
                onChange={e => set(e.target.value)}
                placeholder={ph}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inp}
              />
            </div>
          ))}

          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Capacidad
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={capacidad}
              onChange={e => setCapacidad(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inp}
            />
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
            disabled={guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear mesa
          </button>
        </div>
      </div>
    </div>
  );
}