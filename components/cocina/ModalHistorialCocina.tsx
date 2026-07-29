// components/cocina/ModalHistorialCocina.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { X, History, Loader2, ChefHat } from 'lucide-react';
import { B } from '@/lib/brand';
import { useGlobalData } from '@/context/GlobalDataContext';

interface ModalHistorialCocinaProps {
  onClose: () => void;
}

function fmtHora(hora: string) {
  // 'hora' viene como 'HH:MM:SS' desde la BD
  return hora?.slice(0, 5) ?? '';
}

export function ModalHistorialCocina({ onClose }: ModalHistorialCocinaProps) {
  const { produccionHoy, refetchProduccion } = useGlobalData();
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refetchProduccion();
      if (mounted) setCargando(false);
    })();
    return () => { mounted = false; };
  }, [refetchProduccion]);

  // Solo entradas de tipo 'produccion' (platos marcados listos en cocina),
  // sin mezclar con 'porcionado' que se registra desde Insumos/Almacén.
  const historial = produccionHoy.filter(p => p.tipo === 'produccion');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: B.cream }}
        >
          <div className="flex items-center gap-2">
            <History className="w-4.5 h-4.5" style={{ color: B.green }} />
            <h2 className="text-base font-black" style={{ color: B.charcoal }}>
              Historial de cocina — hoy
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: B.muted }}
            onMouseEnter={e => (e.currentTarget.style.background = B.cream)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: B.green }} />
            </div>
          ) : historial.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16" style={{ color: B.muted }}>
              <ChefHat className="w-10 h-10 opacity-25" />
              <p className="text-sm">Aún no hay platos marcados como listos hoy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historial.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: B.cream }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: B.charcoal }}>
                      {p.cantidad} {p.unidad} · {p.producto?.nombre ?? 'Producto'}
                    </p>
                    {p.notas && (
                      <p className="text-xs truncate" style={{ color: B.muted }}>
                        {p.notas}
                      </p>
                    )}
                    {p.usuario?.nombre && (
                      <p className="text-[11px]" style={{ color: B.muted }}>
                        Por {p.usuario.nombre}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-semibold shrink-0" style={{ color: B.green }}>
                    {fmtHora(p.hora)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}