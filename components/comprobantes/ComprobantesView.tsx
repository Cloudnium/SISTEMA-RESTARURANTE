// components/comprobantes/ComprobantesView.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { anularVenta } from '@/lib/supabase/queries';
import { actualizarMetodoPagoVenta } from '@/lib/supabase/queries/metodoPago'; // ← NUEVO

import { ComprobantesKpis }    from './ComprobantesKpis';
import { ComprobantesFiltros } from './ComprobantesFiltros';
import { ComprobantesTabla }   from './ComprobantesTabla';
import { ModalVerComprobante } from './modals/ModalVerComprobante';
import { ModalCambiarMetodoPago } from './modals/ModalCambiarMetodoPago'; // ← NUEVO
import { ToastComprobante }    from './ToastComprobante';
import { fetchVentaItems }     from '@/utils/comprobantes/comprobantesUtils';

import type {
  CompDetalle, SortDir, TipoFiltro, EstadoFiltro,
} from '@/constants/comprobantes/comprobantesConstants';
import type { MetodoPago } from '@/lib/supabase/types'; // ← NUEVO

export default function ComprobantesView() {
  // ── GlobalData ─────────────────────────────────────────────────────────────
  const {
    comprobantes: comprobantesRaw,
    isLoading,
    refetchComprobantes,
  } = useGlobalData();

  const { usuario: yo } = useAuth(); // ← NUEVO: usuario actual, para fn_cambiar_metodo_pago_venta

  const listaBase = useMemo(
    () => comprobantesRaw as unknown as CompDetalle[],
    [comprobantesRaw],
  );

  // ── Overrides optimistas: mapa de id → estado anulado ────────────────────
  // Cuando el cajero anula, el Realtime puede tardar en actualizar GlobalData.
  // Guardamos los ids anulados localmente para que la fila se marque
  // inmediatamente sin esperar el refetch.
  const [anulados, setAnulados] = useState<Set<string>>(new Set());

  // ← NUEVO: overrides optimistas de método de pago (id → nuevo método)
  const [metodosOverride, setMetodosOverride] = useState<Record<string, MetodoPago>>({});

  // Fusionar lista base con overrides optimistas
  const lista = useMemo(
    () => listaBase.map(c => ({
      ...c,
      ...(anulados.has(c.id) ? { estado: 'anulado' as const } : {}),
      ...(metodosOverride[c.id] ? { metodo_pago: metodosOverride[c.id] } : {}),
    })),
    [listaBase, anulados, metodosOverride],
  );

  // ── Estado local de UI ─────────────────────────────────────────────────────
  const [itemsCache,   setItemsCache]   = useState<Record<string, CompDetalle>>({});
  const [busqueda,     setBusqueda]     = useState('');
  const [tipoFiltro,   setTipoFiltro]   = useState<TipoFiltro>('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');
  const [sortDir,      setSortDir]      = useState<SortDir>('desc');
  const [pagina,       setPagina]       = useState(1);
  const [modalComp,    setModalComp]    = useState<CompDetalle | null>(null);
  const [modalMetodoPago, setModalMetodoPago] = useState<CompDetalle | null>(null); // ← NUEVO
  const [toast,        setToast]        = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ── Sincronizar modal con Realtime: solo si el estado cambió ──────────────
  useEffect(() => {
    if (!modalComp) return;
    const frescoEnLista = lista.find(c => c.id === modalComp.id);
    if (!frescoEnLista || frescoEnLista.estado === modalComp.estado) return;

    const id = setTimeout(() => {
      setModalComp(prev => {
        if (!prev || prev.id !== frescoEnLista.id) return prev;
        const cached = itemsCache[prev.id];
        return {
          ...frescoEnLista,
          ...(cached ? { items: cached.items, itemsLoaded: cached.itemsLoaded } : {}),
        };
      });
    }, 0);

    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista]);

  // ── Abrir modal + items bajo demanda ───────────────────────────────────────
  const abrirModal = useCallback(async (comp: CompDetalle) => {
    // Aplicar override optimista al abrir el modal también
    const compConEstado: CompDetalle = anulados.has(comp.id)
      ? { ...comp, estado: 'anulado' as const }
      : comp;

    const cached = itemsCache[comp.id];
    if (cached) {
      setModalComp({ ...cached, estado: compConEstado.estado });
      return;
    }

    setModalComp(compConEstado);
    if (!comp.venta_id) {
      setModalComp({ ...compConEstado, itemsLoaded: true });
      return;
    }

    try {
      const items   = await fetchVentaItems(comp.venta_id);
      const updated = { ...compConEstado, items, itemsLoaded: true };
      setModalComp(updated);
      setItemsCache(prev => ({ ...prev, [comp.id]: updated }));
    } catch {
      setModalComp({ ...compConEstado, items: [], itemsLoaded: true });
    }
  }, [itemsCache, anulados]);

  // ── Anular ─────────────────────────────────────────────────────────────────
  const handleAnular = useCallback(async (comprobanteId: string, ventaId: string) => {
    try {
      await anularVenta(ventaId);

      // Actualización optimista inmediata: marcar en la lista y en el cache
      setAnulados(prev => new Set(prev).add(comprobanteId));

      setItemsCache(prev => {
        if (!prev[comprobanteId]) return prev;
        return {
          ...prev,
          [comprobanteId]: { ...prev[comprobanteId], estado: 'anulado' as const },
        };
      });

      setModalComp(prev =>
        prev?.id === comprobanteId ? { ...prev, estado: 'anulado' as const } : prev,
      );

      setToast({ msg: 'Comprobante anulado. Stock y caja revertidos.', type: 'success' });
      void refetchComprobantes();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Error al anular', type: 'error' });
      throw e;
    }
  }, [refetchComprobantes]);

  // ── Cambiar método de pago ─────────────────────────────────────────────── ← NUEVO
  const handleCambiarMetodoPago = useCallback(async (metodo: MetodoPago) => {
    if (!modalMetodoPago?.venta_id || !yo?.id) {
      throw new Error('No se pudo identificar la venta o el usuario actual');
    }
    const comprobanteId = modalMetodoPago.id;
    const ventaId       = modalMetodoPago.venta_id;

    await actualizarMetodoPagoVenta(ventaId, metodo, yo.id);

    // Optimista: refleja el cambio de inmediato en la tabla y en el cache de items
    setMetodosOverride(prev => ({ ...prev, [comprobanteId]: metodo }));
    setItemsCache(prev => {
      if (!prev[comprobanteId]) return prev;
      return { ...prev, [comprobanteId]: { ...prev[comprobanteId], metodo_pago: metodo } };
    });

    setToast({ msg: 'Método de pago actualizado correctamente.', type: 'success' });
    void refetchComprobantes();
  }, [modalMetodoPago, yo, refetchComprobantes]);

  // ── Filtrado + ordenamiento ────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return lista
      .filter(c => {
        const matchQ = !q
          || c.numero.toLowerCase().includes(q)
          || (c.cliente_nombre ?? '').toLowerCase().includes(q)
          || c.usuario_nombre.toLowerCase().includes(q)
          || (c.dni ?? '').includes(q)
          || (c.ruc ?? '').includes(q);
        return (
          matchQ
          && (tipoFiltro   === 'todos' || c.tipo   === tipoFiltro)
          && (estadoFiltro === 'todos' || c.estado === estadoFiltro)
        );
      })
      .sort((a, b) =>
        sortDir === 'desc'
          ? b.fecha_emision.localeCompare(a.fecha_emision)
          : a.fecha_emision.localeCompare(b.fecha_emision),
      );
  }, [lista, busqueda, tipoFiltro, estadoFiltro, sortDir]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleBusqueda = useCallback((v: string)       => { setBusqueda(v);     setPagina(1); }, []);
  const handleTipo     = useCallback((v: TipoFiltro)   => { setTipoFiltro(v);   setPagina(1); }, []);
  const handleEstado   = useCallback((v: EstadoFiltro) => { setEstadoFiltro(v); setPagina(1); }, []);
  const handleLimpiar  = useCallback(() => {
    setBusqueda(''); setTipoFiltro('todos'); setEstadoFiltro('todos'); setPagina(1);
  }, []);
  const handleSortDir = useCallback(() => {
    setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    setPagina(1);
  }, []);
  const handleRefresh = useCallback(() => {
    setAnulados(new Set()); // limpiar overrides al refrescar manualmente
    void refetchComprobantes();
  }, [refetchComprobantes]);

  // ── Loading inicial ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Comprobantes"
        subtitle={`Boletas, facturas y notas de venta · Total: ${lista.length}`}
        action={
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg transition-colors"
            style={{ color: B.muted }}
            title="Refrescar"
            onMouseEnter={e => { e.currentTarget.style.background = B.cream; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <ComprobantesKpis lista={lista} />

      <ComprobantesFiltros
        busqueda={busqueda}
        tipoFiltro={tipoFiltro}
        estadoFiltro={estadoFiltro}
        totalFiltrado={filtrados.length}
        totalLista={lista.length}
        onBusqueda={handleBusqueda}
        onTipo={handleTipo}
        onEstado={handleEstado}
        onLimpiar={handleLimpiar}
      />

      <ComprobantesTabla
        filtrados={filtrados}
        sortDir={sortDir}
        pagina={pagina}
        onSortDir={handleSortDir}
        onPagina={setPagina}
        onAbrirModal={comp => void abrirModal(comp)}
        onCambiarMetodoPago={comp => setModalMetodoPago(comp)} // ← NUEVO
      />

      {modalComp && (
        <ModalVerComprobante
          comp={modalComp}
          onClose={() => setModalComp(null)}
          onAnular={handleAnular}
        />
      )}

      {/* ← NUEVO: modal de cambio de método de pago */}
      {modalMetodoPago && (
        <ModalCambiarMetodoPago
          comp={modalMetodoPago}
          onClose={() => setModalMetodoPago(null)}
          onGuardar={handleCambiarMetodoPago}
        />
      )}

      {toast && (
        <ToastComprobante
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}