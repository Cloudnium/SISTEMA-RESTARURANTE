// components/clientes/ClientesView.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, AlertTriangle, X, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { eliminarCliente } from '@/lib/supabase/queries';
import type { Cliente, TipoCliente } from '@/lib/supabase/types';

import {
  ClientesKpis,
  ClientesFiltros,
  ClientesTabla,
  ModalCliente,
} from '../../utils/clientes/index';

// ─── Estado del modal ────────────────────────────────────────────────────────

interface ModalState {
  open:    boolean;
  cliente: Cliente | null;
}

const MODAL_CERRADO: ModalState = { open: false, cliente: null };

// ─── Orquestador ─────────────────────────────────────────────────────────────

export default function ClientesView() {
  const { clientes, isLoading, refetchClientes } = useGlobalData();

  // ── Filtros ────────────────────────────────────────────────────────────
  const [busqueda,   setBusqueda]   = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoCliente>('todos');

  // ── Modal ──────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<ModalState>(MODAL_CERRADO);

  // ── Eliminación ────────────────────────────────────────────────────────
  const [elimError, setElimError] = useState('');

  // ── Clientes filtrados (memoizado) ─────────────────────────────────────
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return clientes.filter(c => {
      const matchQ    = !q
        || c.nombre.toLowerCase().includes(q)
        || (c.dni ?? '').includes(q)
        || (c.ruc ?? '').includes(q);
      const matchTipo = tipoFiltro === 'todos' || c.tipo === tipoFiltro;
      return matchQ && matchTipo;
    });
  }, [clientes, busqueda, tipoFiltro]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const abrirNuevo  = useCallback(() => setModal({ open: true, cliente: null }),  []);
  const abrirEditar = useCallback((c: Cliente) => setModal({ open: true, cliente: c }), []);
  const cerrarModal = useCallback(() => setModal(MODAL_CERRADO), []);

  const handleSaved = useCallback(() => {
    setModal(MODAL_CERRADO);
    refetchClientes();
  }, [refetchClientes]);

  const handleEliminar = useCallback(async (id: string) => {
    if (!confirm('¿Desactivar este cliente? Podrá reactivarlo editándolo.')) return;
    setElimError('');
    try {
      await eliminarCliente(id);
      refetchClientes();
    } catch (e) {
      setElimError(e instanceof Error ? e.message : 'Error al desactivar el cliente');
    }
  }, [refetchClientes]);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Clientes"
        subtitle={`Base de clientes · Total: ${clientes.length}`}
        action={
          <Btn onClick={abrirNuevo}>
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </Btn>
        }
      />

      {/* KPIs */}
      <ClientesKpis clientes={clientes} />

      {/* Banner de error de eliminación */}
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

      {/* Filtros */}
      <ClientesFiltros
        busqueda={busqueda}
        tipoFiltro={tipoFiltro}
        onBusqueda={setBusqueda}
        onTipoFiltro={setTipoFiltro}
      />

      {/* Tabla */}
      <ClientesTabla
        clientes={filtrados}
        onEditar={abrirEditar}
        onEliminar={handleEliminar}
      />

      {/* Modal crear / editar */}
      {modal.open && (
        <ModalCliente
          cliente={modal.cliente}
          onClose={cerrarModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}