// components/usuarios/UsuariosView.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { supabase } from '@/lib/supabase/client';
import type { Usuario, RolUsuario } from '@/lib/supabase/types';

import { UsuariosKpis            } from './UsuariosKpis';
import { UsuariosFiltros         } from './UsuariosFiltros';
import { UsuariosTabla           } from './UsuariosTabla';
import { ModalUsuario            } from '@/components/usuarios/modals/ModalUsuario';
import { ModalConfirmarEliminar  } from '@/components/usuarios/modals/ModalConfirmarEliminar';
import type { EstadoFiltro, RolFiltro } from '@/constants/usuarios/constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Estado de modales ────────────────────────────────────────────────────────

interface ModalEditorState {
  open:    boolean;
  usuario: Usuario | null;
}

const MODAL_CERRADO: ModalEditorState = { open: false, usuario: null };

// ─── Orquestador ─────────────────────────────────────────────────────────────

export function UsuariosView() {
  const { usuarios, cajas, isLoading, refetchUsuarios } = useGlobalData();

  // ── Filtros ────────────────────────────────────────────────────────────
  const [busqueda,      setBusqueda]      = useState('');
  const [rolFiltro,     setRolFiltro]     = useState<RolFiltro>('todos');
  const [estadoFiltro,  setEstadoFiltro]  = useState<EstadoFiltro>('todos');

  // ── Modales ────────────────────────────────────────────────────────────
  const [modal,     setModal]     = useState<ModalEditorState>(MODAL_CERRADO);
  const [modalElim, setModalElim] = useState<Usuario | null>(null);

  // ── Estado de eliminación ──────────────────────────────────────────────
  const [elimLoading, setElimLoading] = useState(false);
  const [elimError,   setElimError]   = useState('');

  // ── Lista filtrada (memoizada) ─────────────────────────────────────────
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return usuarios.filter(u => {
      const matchQ      = !q
        || u.nombre.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q)
        || (u.dni ?? '').includes(q);
      const matchRol    = rolFiltro    === 'todos' || u.rol === rolFiltro;
      const matchEstado = estadoFiltro === 'todos'
        || (estadoFiltro === 'activo' ? u.activo : !u.activo);
      return matchQ && matchRol && matchEstado;
    });
  }, [usuarios, busqueda, rolFiltro, estadoFiltro]);

  // ── Handlers de modal editor ───────────────────────────────────────────
  const abrirNuevo   = useCallback(() => setModal({ open: true, usuario: null }), []);
  const abrirEditar  = useCallback((u: Usuario) => setModal({ open: true, usuario: u }), []);
  const cerrarModal  = useCallback(() => setModal(MODAL_CERRADO), []);

  const handleSaved = useCallback(() => {
    setModal(MODAL_CERRADO);
    refetchUsuarios();
  }, [refetchUsuarios]);

  // ── Handlers de eliminación ────────────────────────────────────────────
  const abrirEliminar = useCallback((u: Usuario) => {
    setElimError('');
    setModalElim(u);
  }, []);

  const cerrarEliminar = useCallback(() => {
    if (!elimLoading) {
      setModalElim(null);
      setElimError('');
    }
  }, [elimLoading]);

  // Desactivar — actualiza activo=false en tabla usuarios
  const handleDesactivar = useCallback(async () => {
    if (!modalElim?.activo) return;
    setElimLoading(true);
    setElimError('');
    try {
      const { error } = await db
        .from('usuarios')
        .update({ activo: false })
        .eq('id', modalElim.id);
      if (error) throw error;
      setModalElim(null);
      refetchUsuarios();
    } catch (e) {
      setElimError(e instanceof Error ? e.message : 'Error al desactivar');
    } finally {
      setElimLoading(false);
    }
  }, [modalElim, refetchUsuarios]);

  // Eliminar permanente — DELETE via API Route (service_role)
  const handleEliminarPermanente = useCallback(async () => {
    if (!modalElim) return;
    setElimLoading(true);
    setElimError('');
    try {
      const res  = await fetch(`/api/usuarios/${modalElim.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al eliminar');
      setModalElim(null);
      refetchUsuarios();
    } catch (e) {
      setElimError(e instanceof Error ? e.message : 'Error al eliminar el usuario');
    } finally {
      setElimLoading(false);
    }
  }, [modalElim, refetchUsuarios]);

  // ── Cajas para el selector del modal ──────────────────────────────────
  const cajasList = useMemo(
    () => cajas
      .filter(c =>
        !c.usuario_id ||                          // sin usuario asignado
        c.id === modal.usuario?.caja_id           // ← o es la caja actual del usuario editado
      )
      .map(c => ({ id: c.id, nombre: c.nombre })),
    [cajas, modal.usuario],
  );

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Gestión de Usuarios"
        subtitle={`Administra el equipo del restaurante · Total: ${usuarios.length}`}
        action={
          <Btn onClick={abrirNuevo}>
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </Btn>
        }
      />

      {/* KPIs */}
      <UsuariosKpis usuarios={usuarios} />

      {/* Filtros */}
      <UsuariosFiltros
        busqueda={busqueda}
        rolFiltro={rolFiltro}
        estadoFiltro={estadoFiltro}
        onBusqueda={setBusqueda}
        onRolFiltro={v => setRolFiltro(v as RolUsuario | 'todos')}
        onEstadoFiltro={setEstadoFiltro}
      />

      {/* Tabla */}
      <UsuariosTabla
        usuarios={filtrados}
        totalUsuarios={usuarios.length}
        onEditar={abrirEditar}
        onEliminar={abrirEliminar}
      />

      {/* Modal crear / editar */}
      {modal.open && (
        <ModalUsuario
          usuario={modal.usuario}
          cajas={cajasList}
          onClose={cerrarModal}
          onSaved={handleSaved}
        />
      )}

      {/* Modal confirmar eliminación */}
      {modalElim && (
        <ModalConfirmarEliminar
          usuario={modalElim}
          loading={elimLoading}
          errorMsg={elimError}
          onClose={cerrarEliminar}
          onDesactivar={handleDesactivar}
          onEliminar={handleEliminarPermanente}
        />
      )}
    </div>
  );
}