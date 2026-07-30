// components/cocina/CocinaView.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChefHat, Loader2, ChevronDown, ChevronUp, History } from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getPedidosCocina, actualizarEstadoItemPedido, marcarPedidoListoParaCocina,
  registrarProduccion, crearNotificacion,
} from '@/lib/supabase/queries';
import type { Pedido, PedidoItem, EstadoPedido } from '@/lib/supabase/types';
import { construirTickets, nombreMesaDe, logErrorNotificacion } from '@/utils/cocina/cocinaUtils';
import TicketCard from '@/components/cocina/TicketCard';
import { ModalHistorialCocina } from '@/components/cocina/modals/ModalHistorialCocina';

const REFRESCO_FALLBACK_MS = 45_000; // poll de respaldo por si el realtime se cae
const TICK_MS               = 30_000; // recalcula minutos de espera en pantalla

// ─── Vista principal ───────────────────────────────────────────────────────────
export default function CocinaView() {
  const { usuario } = useAuth();

  const [pedidos,   setPedidos]   = useState<Pedido[]>([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState('');
  const [ahoraMs,   setAhoraMs]   = useState(() => Date.now());
  const [verListos, setVerListos] = useState(true);
  const [itemsProcesando, setItemsProcesando] = useState<Set<string>>(new Set());
  const [showHistorial, setShowHistorial]     = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await getPedidosCocina();
      setPedidos(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los pedidos de cocina');
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga inicial + poll de respaldo (por si el realtime se corta)
  const cargaIniciadaRef = useRef(false);
  useEffect(() => {
    if (!cargaIniciadaRef.current) {
      cargaIniciadaRef.current = true;
      cargar();
    }
    const poll = setInterval(cargar, REFRESCO_FALLBACK_MS);
    return () => clearInterval(poll);
  }, [cargar]);

  // Reloj para recalcular minutos de espera en pantalla
  useEffect(() => {
    const tick = setInterval(() => setAhoraMs(Date.now()), TICK_MS);
    return () => clearInterval(tick);
  }, []);

  // Realtime: cualquier cambio en pedido_items o pedidos → refrescar el tablero
  useEffect(() => {
    const canal = supabase
      .channel('kds-cocina')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargar())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [cargar]);

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
      cargar(); // revertir con el estado real de la base de datos
    } finally {
      marcarProcesando(item.id, false);
    }
  }, [cargar, pedidos, usuario]);

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
      cargar();
    }
  }, [cargar, pedidos, usuario]);

  if (cargando) return (
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