// components/mesas/MesasView.tsx
'use client';

import { useState, useMemo } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { actualizarEstadoMesa, cancelarMesa } from '@/lib/supabase/queries';
import type { EstadoMesa } from '@/lib/supabase/types';

import { ESTADOS, ESTADOS_CIERRAN_MODAL } from '@/constants/mesas/mesasConstants';
import { type MesaRow } from '@/utils/mesas/mesasUtils';
import MesaCard from '@/components/mesas/MesaCard';
import MesaModal from '@/components/mesas/MesaModal';
import ModalNuevaMesa from '@/components/mesas/modals/ModalNuevaMesa';

export default function MesasView() {
  const { mesas, cajas, isLoading, refetchMesas } = useGlobalData();
  const { usuario } = useAuth();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cambiando,   setCambiando]  = useState(false);
  const [modalNueva,  setModalNueva] = useState(false);

  // Se deriva de `mesas` en cada render — nunca queda desactualizada y no
  // hace falta un efecto que la sincronice manualmente.
  const selected = useMemo(
    () => (selectedId ? (mesas.find(m => m.id === selectedId) as MesaRow | undefined) ?? null : null),
    [mesas, selectedId],
  );

  // ── Validación de caja abierta (igual que en VentasView) ─────────────────
  const cajaAbierta = useMemo(() => {
    if (!usuario?.caja_id) return false;
    const caja = cajas.find(c => c.id === usuario.caja_id);
    return caja?.estado === 'abierta';
  }, [cajas, usuario]);

  // NOTA: el realtime de `mesas` y `pedidos` ya se maneja de forma
  // centralizada en GlobalDataContext (canal 'global-realtime'). Antes este
  // componente abría un segundo canal duplicado escuchando las mismas tablas,
  // lo cual generaba condiciones de carrera y refetch redundantes. Se eliminó
  // ese efecto — refetchMesas() ya llega solo vía el contexto global.

  // ── Datos derivados ───────────────────────────────────────────────────────
  const zonas = useMemo(
    () => [...new Set(mesas.map(m => m.zona))].sort(),
    [mesas],
  );

  const counts = useMemo(
    () =>
      (Object.keys(ESTADOS) as EstadoMesa[]).reduce(
        (acc, k) => ({ ...acc, [k]: mesas.filter(m => m.estado === k).length }),
        {} as Record<EstadoMesa, number>,
      ),
    [mesas],
  );

  // ── Cambiar estado de mesa ────────────────────────────────────────────────
  // Regla: si la mesa tiene un pedido activo (pedido_id != null → hay consumo
  // sin cobrar todavía), no se permite cambiar el estado manualmente. El
  // estado solo debe pasar a 'limpieza' cuando se concreta la venta
  // (crearVenta, en queries/index.ts) o a 'ocupada' al abrir el pedido.
  const handleCambiarEstado = async (id: string, nuevoEstado: EstadoMesa) => {
    if (!selected || selected.estado === nuevoEstado || cambiando) return;

    if (selected.pedido_id) {
      console.warn('No se puede cambiar el estado: la mesa tiene un pedido sin cobrar.');
      return;
    }

    setCambiando(true);
    try {
      await actualizarEstadoMesa(id, nuevoEstado);
      if (ESTADOS_CIERRAN_MODAL.includes(nuevoEstado)) {
        setSelectedId(null);
      }
      refetchMesas().catch(console.error);
    } catch (e) {
      console.error('Error al cambiar estado:', e);
      refetchMesas().catch(console.error);
    } finally {
      setCambiando(false);
    }
  };

  // ── Cancelar mesa ─────────────────────────────────────────────────────────
  // Distinto de "cambiar estado": esta acción SÍ funciona con pedido activo.
  // Cancela el pedido (y sus items) sin tocar stock, y libera la mesa —
  // todo en una sola transacción vía RPC (fn_cancelar_mesa).
  const handleCancelarMesa = async (id: string) => {
    if (cambiando) return;

    setCambiando(true);
    try {
      await cancelarMesa(id, usuario?.id ?? '');
      setSelectedId(null);
      refetchMesas().catch(console.error);
    } catch (e) {
      console.error('Error al cancelar mesa:', e);
      refetchMesas().catch(console.error);
    } finally {
      setCambiando(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Mesas"
        subtitle="Gestión del espacio del restaurante"
        action={
          <Btn onClick={() => setModalNueva(true)}>
            <Plus className="w-4 h-4" />Nueva Mesa
          </Btn>
        }
      />

      {/* Resumen de estados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(Object.entries(ESTADOS) as [EstadoMesa, (typeof ESTADOS)[EstadoMesa]][]).map(
          ([key, val]) => (
            <div
              key={key}
              className="rounded-xl px-4 py-3 flex items-center gap-3 font-bold"
              style={{ background: val.bg, border: `1px solid ${val.color}25` }}
            >
              <val.icon className="w-5 h-5 shrink-0" style={{ color: val.color }} />
              <div>
                <p className="text-xs" style={{ color: val.color }}>{val.label}</p>
                <p className="text-2xl font-bold" style={{ color: B.charcoal }}>{counts[key]}</p>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Grid por zonas */}
      {zonas.map(zona => (
        <div key={zona} className="mb-6">
          <h2
            className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: B.charcoal }}
          >
            <div className="w-1 h-4 rounded-full shrink-0" style={{ background: B.gold }} />
            {zona}
            <span className="text-xs font-normal" style={{ color: B.muted }}>
              · {mesas.filter(m => m.zona === zona).length} mesas
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {mesas.filter(m => m.zona === zona).map(mesa => (
              <MesaCard
                key={mesa.id}
                mesa={mesa as MesaRow}
                onClick={m => setSelectedId(m.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {mesas.length === 0 && (
        <div className="py-20 text-center text-sm" style={{ color: B.muted }}>
          No hay mesas configuradas
        </div>
      )}

      {selected && (
        <MesaModal
          mesa={selected}
          cajaAbierta={cajaAbierta}
          onClose={() => setSelectedId(null)}
          onCambiarEstado={handleCambiarEstado}
          onCancelarMesa={handleCancelarMesa}
          cambiando={cambiando}
        />
      )}

      {modalNueva && (
        <ModalNuevaMesa
          onClose={() => setModalNueva(false)}
          onSaved={() => { setModalNueva(false); refetchMesas(); }}
        />
      )}
    </div>
  );
}