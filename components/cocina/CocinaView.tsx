// components/cocina/CocinaView.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChefHat, Loader2, ChevronDown, ChevronUp, History } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthContext';
import { useGlobalData } from '@/context/GlobalDataContext';
import {
  actualizarEstadoItemPedido, marcarPedidoListoParaCocina,
  registrarProduccion, crearNotificacion,
} from '@/lib/supabase/queries';
import type { Pedido, PedidoItem, EstadoPedido } from '@/lib/supabase/types';
import { construirTickets, nombreMesaDe, logErrorNotificacion } from '@/utils/cocina/cocinaUtils';
import TicketCard from '@/components/cocina/TicketCard';
import { ModalHistorialCocina } from '@/components/cocina/modals/ModalHistorialCocina';

const TICK_MS = 30_000; // recalcula minutos de espera en pantalla

// ─── Vista principal ───────────────────────────────────────────────────────────
export default function CocinaView() {
  const { usuario } = useAuth();
  const { pedidosCocina, isLoading, refetchPedidosCocina } = useGlobalData();

  // Estado local = espejo de pedidosCocina (que ahora vive en el contexto
  // global, igual que mesas/cajas/productos) + overlay optimista para que
  // los toggles se sientan instantáneos. Al vivir los datos "de verdad" en
  // el contexto, sobreviven a que este componente se desmonte al cambiar de
  // sección — por eso ya no aparece el spinner de carga cada vez que se
  // vuelve a entrar a Cocina.
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosCocina);

  // Sincroniza con el contexto global cuando llegan datos nuevos (carga
  // inicial, realtime o el poll de respaldo). Patrón "ajustar estado durante
  // el render" (igual que en ModalHistorialCocina.tsx) en vez de un
  // useEffect, para evitar el aviso del compilador de React sobre setState
  // directo dentro de un efecto.
  const [pedidosContextAnterior, setPedidosContextAnterior] = useState(pedidosCocina);
  if (pedidosCocina !== pedidosContextAnterior) {
    setPedidosContextAnterior(pedidosCocina);
    setPedidos(pedidosCocina);
  }

  const [error,     setError]     = useState('');
  const [ahoraMs,   setAhoraMs]   = useState(() => Date.now());
  const [verListos, setVerListos] = useState(true);
  const [itemsProcesando, setItemsProcesando] = useState<Set<string>>(new Set());
  const [showHistorial, setShowHistorial]     = useState(false);

  // Reloj para recalcular minutos de espera en pantalla
  useEffect(() => {
    const tick = setInterval(() => setAhoraMs(Date.now()), TICK_MS);
    return () => clearInterval(tick);
  }, []);

  const tickets          = useMemo(() => construirTickets(pedidos), [pedidos]);
  const enPreparacion    = useMemo(() => tickets.filter(t => t.pendientes.length > 0), [tickets]);
  const listosEsperando  = useMemo(() => tickets.filter(t => t.pendientes.length === 0), [tickets]);
  const totalPendientes  = useMemo(
    () => enPreparacion.reduce((s, t) => s + t.pendientes.length, 0),
    [enPreparacion],
  );

  const marcarProcesando = (id: string, activo: boolean) => {
    setItemsProcesando(prev => {
      const next = new Set(prev);
      if (activo) next.add(id); else next.delete(id);
      return next;
    });
  };

  const toggleItem = useCallback(async (item: PedidoItem) => {
    const nuevoEstado: EstadoPedido = item.estado === 'listo' ? 'enviado_cocina' : 'listo';
    const pasaAListo = nuevoEstado === 'listo';
    marcarProcesando(item.id, true);

    // Actualización optimista para que se sienta instantáneo en pantalla
    setPedidos(prev => prev.map(p => ({
      ...p,
      items: (p.items ?? []).map(i => (i.id === item.id ? { ...i, estado: nuevoEstado } : i)),
    })));

    try {
      await actualizarEstadoItemPedido(item.id, nuevoEstado);

      // Solo al pasar a "listo": queda en el historial de cocina (sin tocar
      // stock, tipo 'produccion') y se avisa al cajero por la campana.
      // Si algo de esto falla, no revertimos el toggle — el item sí quedó
      // marcado listo en la BD, que es lo importante.
      if (pasaAListo && usuario) {
        const pedidoDueno = pedidos.find(p => (p.items ?? []).some(i => i.id === item.id));
        const nombreMesa  = nombreMesaDe(pedidoDueno);

        registrarProduccion(
          item.producto_id,
          'produccion',
          item.cantidad,
          item.producto?.unidad_medida ?? 'und',
          usuario.id,
          `Listo para servir · ${nombreMesa}`,
        ).catch(e => logErrorNotificacion('No se pudo registrar en historial de cocina', e));

        crearNotificacion({
          tipo:    'pedido_listo',
          titulo:  'Pedido listo',
          mensaje: `${nombreMesa} · ${item.cantidad}× ${item.producto?.nombre ?? 'producto'} listo para recoger y entregar`,
        }).catch(e => logErrorNotificacion('No se pudo enviar la notificación', e));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el item');
      refetchPedidosCocina(); // revertir con el estado real de la base de datos
    } finally {
      marcarProcesando(item.id, false);
    }
  }, [refetchPedidosCocina, pedidos, usuario]);

  const marcarTodoListo = useCallback(async (pedidoId: string) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    const pendientesDelPedido = (pedido?.items ?? []).filter(i => i.estado === 'enviado_cocina');

    setPedidos(prev => prev.map(p => (
      p.id === pedidoId
        ? { ...p, items: (p.items ?? []).map(i => (i.estado === 'enviado_cocina' ? { ...i, estado: 'listo' as EstadoPedido } : i)) }
        : p
    )));
    try {
      await marcarPedidoListoParaCocina(pedidoId);

      if (usuario && pedido && pendientesDelPedido.length > 0) {
        const nombreMesa = nombreMesaDe(pedido);

        Promise.all(
          pendientesDelPedido.map(i =>
            registrarProduccion(
              i.producto_id,
              'produccion',
              i.cantidad,
              i.producto?.unidad_medida ?? 'und',
              usuario.id,
              `Listo para servir · ${nombreMesa}`,
            ),
          ),
        ).catch(e => logErrorNotificacion('No se pudo registrar en historial de cocina', e));

        crearNotificacion({
          tipo:    'pedido_listo',
          titulo:  'Pedido listo',
          mensaje: `${nombreMesa} · pedido completo listo para recoger y entregar (${pendientesDelPedido.length} ítem${pendientesDelPedido.length !== 1 ? 's' : ''})`,
        }).catch(e => logErrorNotificacion('No se pudo enviar la notificación', e));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo marcar el pedido como listo');
      refetchPedidosCocina();
    }
  }, [refetchPedidosCocina, pedidos, usuario]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Cocina"
        subtitle={`Pedidos enviados desde las mesas · ${new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}`}
        action={
          <Btn onClick={() => setShowHistorial(true)}>
            <History className="w-4 h-4" />
            Historial
          </Btn>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Tickets en cola',  value: enPreparacion.length,   unit: 'mesas por preparar', color: B.terra },
          { label: 'Items pendientes', value: totalPendientes,        unit: 'platos por salir',   color: B.charcoal },
          { label: 'Listos',           value: listosEsperando.length, unit: 'esperando entrega',  color: B.green },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-widest" style={{ color: B.muted }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: B.muted }}>{s.unit}</p>
          </Card>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-xl text-xs" style={{ background: '#fef0e6', color: B.terra }}>
          {error}
        </div>
      )}

      {/* En preparación */}
      {enPreparacion.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 py-16 rounded-2xl"
          style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.muted }}
        >
          <ChefHat className="w-10 h-10 opacity-25" />
          <p className="text-sm">No hay pedidos pendientes por preparar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {enPreparacion.map(ticket => (
            <TicketCard
              key={ticket.pedido.id}
              ticket={ticket}
              ahoraMs={ahoraMs}
              onToggleItem={toggleItem}
              onMarcarTodoListo={marcarTodoListo}
              itemsProcesando={itemsProcesando}
            />
          ))}
        </div>
      )}

      {/* Listos, esperando que los recojan */}
      {listosEsperando.length > 0 && (
        <div>
          <button
            onClick={() => setVerListos(v => !v)}
            className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-widest"
            style={{ color: B.muted }}
          >
            {verListos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Listos para servir ({listosEsperando.length})
          </button>
          {verListos && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {listosEsperando.map(ticket => (
                <TicketCard
                  key={ticket.pedido.id}
                  ticket={ticket}
                  ahoraMs={ahoraMs}
                  onToggleItem={toggleItem}
                  onMarcarTodoListo={marcarTodoListo}
                  itemsProcesando={itemsProcesando}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showHistorial && (
        <ModalHistorialCocina onClose={() => setShowHistorial(false)} />
      )}
    </div>
  );
}