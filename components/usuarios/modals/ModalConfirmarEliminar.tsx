// components/usuarios/ModalConfirmarEliminar.tsx
'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import type { Usuario } from '@/lib/supabase/types';

interface ModalConfirmarEliminarProps {
  usuario:      Usuario;
  loading:      boolean;
  errorMsg:     string;
  onClose:      () => void;
  onDesactivar: () => Promise<void>;
  onEliminar:   () => Promise<void>;
}

export function ModalConfirmarEliminar({
  usuario, loading, errorMsg,
  onClose, onDesactivar, onEliminar,
}: ModalConfirmarEliminarProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={!loading ? onClose : undefined}
    >
      <div
        className="rounded-2xl w-full max-w-sm shadow-2xl"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Encabezado */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#fee2e2' }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: B.terra }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: B.charcoal }}>
                ¿Qué deseas hacer?
              </h2>
              <p className="text-xs mt-0.5" style={{ color: B.muted }}>
                {usuario.nombre} · {usuario.email}
              </p>
            </div>
          </div>

          {/* Opciones */}
          <div className="space-y-2 mb-4">
            {/* Opción 1: Desactivar */}
            <button
              onClick={onDesactivar}
              disabled={loading || !usuario.activo}
              className="w-full text-left px-4 py-3 rounded-xl transition-all disabled:opacity-40"
              style={{ background: `${B.gold}12`, border: `1px solid ${B.gold}30` }}
              onMouseEnter={e => {
                if (!loading && usuario.activo)
                  e.currentTarget.style.background = `${B.gold}20`;
              }}
              onMouseLeave={e => (e.currentTarget.style.background = `${B.gold}12`)}
            >
              <p className="text-sm font-bold" style={{ color: B.charcoal }}>
                {usuario.activo ? 'Desactivar usuario' : 'Usuario ya inactivo'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: B.muted }}>
                No podrá iniciar sesión. Sus datos se conservan. Reversible.
              </p>
            </button>

            {/* Opción 2: Eliminar permanente */}
            <button
              onClick={onEliminar}
              disabled={loading}
              className="w-full text-left px-4 py-3 rounded-xl transition-all"
              style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
              onMouseEnter={e => {
                if (!loading) e.currentTarget.style.background = '#fee2e2';
              }}
              onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold" style={{ color: B.terra }}>
                    Eliminar permanentemente
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: B.muted }}>
                    Elimina de Auth y la base de datos. Irreversible.
                  </p>
                </div>
                {loading && (
                  <Loader2
                    className="w-4 h-4 animate-spin shrink-0 ml-2"
                    style={{ color: B.terra }}
                  />
                )}
              </div>
            </button>
          </div>

          {/* Error */}
          {errorMsg && (
            <div
              className="mb-3 px-3 py-2 rounded-xl text-xs"
              style={{ background: '#fef0e6', color: B.terra }}
            >
              {errorMsg}
            </div>
          )}

          {/* Cancelar */}
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}