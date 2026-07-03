// components/compras/ComprasView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Plus, X, AlertTriangle, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { eliminarCompra } from '@/lib/supabase/queries';
import type { Compra, TipoComprobanteCompra } from '@/lib/supabase/types';

// Sub-componentes
import { ComprasKpis }   from './ComprasKpis';
import { ComprasFiltro } from './ComprasFiltro';
import { ComprasTabla }  from './ComprasTabla';
import { ModalCompra }   from './modals/ModalCompra';

// ─── Vista principal ──────────────────────────────────────────────────────────
export function ComprasView() {
  const { compras, isLoading, refetchCompras, metricas } = useGlobalData();

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [busqueda,   setBusqueda]   = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoComprobanteCompra>('todos');

  // null = cerrado | undefined = nueva | Compra = editar
  const [modal,     setModal]     = useState<null | undefined | Compra>(null);
  const [elimError, setElimError] = useState('');

  // ── Filtrado memoizado ─────────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return compras.filter(c => {
      const comprobante = [c.serie, c.numero].filter(Boolean).join('-');
      const matchQ =
        !q ||
        c.proveedor_nombre.toLowerCase().includes(q) ||
        comprobante.toLowerCase().includes(q) ||
        (c.proveedor_doc ?? '').includes(q);
      const matchTipo = tipoFiltro === 'todos' || c.tipo_comprobante === tipoFiltro;
      return matchQ && matchTipo;
    });
  }, [compras, busqueda, tipoFiltro]);

  // ── Acciones ───────────────────────────────────────────────────────────────
  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta compra? Esta acción no se puede deshacer.')) return;
    setElimError('');
    try {
      await eliminarCompra(id);
      refetchCompras();
    } catch (e) {
      setElimError(e instanceof Error ? e.message : 'Error al eliminar la compra');
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Compras"
        subtitle={`Registro de comprobantes de compra · Total: ${compras.length} comprobantes`}
        action={
          <Btn onClick={() => setModal(undefined)}>
            <Plus className="w-4 h-4" />
            Nueva compra
          </Btn>
        }
      />

      {/* KPIs */}
      <ComprasKpis compras={compras} metricas={metricas} />

      {/* Error de eliminación */}
      {elimError && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4"
          style={{ background: '#fef0e6', border: `1px solid ${B.terra}30` }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: B.terra }} />
          <p className="text-sm" style={{ color: B.terra }}>{elimError}</p>
          <button
            onClick={() => setElimError('')}
            className="ml-auto p-0.5 rounded"
            style={{ color: B.terra }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtro */}
      <ComprasFiltro
        busqueda={busqueda}
        tipoFiltro={tipoFiltro}
        onBusqueda={setBusqueda}
        onTipoFiltro={setTipoFiltro}
      />

      {/* Tabla */}
      <ComprasTabla
        compras={filtrados}
        totalCount={compras.length}
        onEditar={c => setModal(c)}
        onEliminar={handleEliminar}
      />

      {/* Modal nueva / editar */}
      {modal !== null && (
        <ModalCompra
          compraEditar={modal as Compra | undefined}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refetchCompras(); }}
        />
      )}
    </div>
  );
}