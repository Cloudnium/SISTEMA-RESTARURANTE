// components/cocina/CocinaView.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChefHat, Clock, CheckCircle2, Loader2, ChevronDown, ChevronUp, History,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getPedidosCocina, actualizarEstadoItemPedido, marcarPedidoListoParaCocina,
  registrarProduccion, crearNotificacion,
} from '@/lib/supabase/queries';
import type { Pedido, PedidoItem, EstadoPedido } from '@/lib/supabase/types';
import {
  construirTickets, minutosDesde, cfgUrgencia, type TicketCocina,
} from '@/utils/cocina/cocinaUtils';
import { corregirFechaBD } from '@/utils/mesas/useElapsedTime';
import { ModalHistorialCocina } from './ModalHistorialCocina';

const REFRESCO_FALLBACK_MS = 45_000; // poll de respaldo por si el realtime se cae
const TICK_MS               = 30_000; // recalcula minutos de espera en pantalla

// FIX: aplica la misma corrección de offset de 5h (utils/mesas/useElapsedTime)
// que ya usas en Mesas/Venta Mesa, para que la hora mostrada sea la real.
function fmtHora(iso: string) {
  const corregida = corregirFechaBD(iso);
  if (!corregida) return '';
  return corregida.toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nombreMesaDe(pedido?: Pedido | null) {
  if (!pedido?.mesa) return 'Mesa';
  return pedido.mesa.nombre ?? `Mesa ${pedido.mesa.numero}`;
}

// Helper para loguear el error real de Supabase/Postgres en vez de "{}"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logErrorNotificacion(contexto: string, e: any) {
  console.error(
    `[Cocina] ${contexto}:`,
    e?.message ?? e?.error_description ?? e?.details ?? e?.code ?? e,
  );
}

// ─── Fila de item dentro de un ticket ─────────────────────────────────────────
function ItemRow({
  item, onToggle, procesando,
}: {
  item: PedidoItem;
  onToggle: (item: PedidoItem) => void;
  procesando: boolean;
}) {
  const listo = item.estado === 'listo';
  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors"
      style={{ background: listo ? '#e8f5e2' : B.cream }}
    >
      <button
        onClick={() => onToggle(item)}
        disabled={procesando}
        className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
        style={{
          background: listo ? B.green : B.white,
          border: `1.5px solid ${listo ? B.green : B.creamDark}`,
        }}
        title={listo ? 'Devolver a pendiente' : 'Marcar como listo'}
      >
        {listo && <CheckCircle2 className="w-4 h-4" style={{ color: '#fff' }} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black shrink-0" style={{ color: listo ? B.green : B.charcoal }}>
            {item.cantidad}×
          </span>
          <p
            className="text-sm font-semibold leading-tight"
            style={{
              color: listo ? B.green : B.charcoal,
              textDecoration: listo ? 'line-through' : 'none',
              opacity: listo ? 0.75 : 1,
            }}
          >
            {item.producto?.nombre ?? 'Producto'}
          </p>
        </div>
        {item.notas && (
          <p
            className="text-xs mt-1 px-2 py-1 rounded-lg inline-block"
            style={{ background: `${B.terra}15`, color: B.terra }}
          >
            📝 {item.notas}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tarjeta ticket (una mesa/pedido) ─────────────────────────────────────────
function TicketCard({
  ticket, ahoraMs, onToggleItem, onMarcarTodoListo, itemsProcesando,
}: {
  ticket:            TicketCocina;
  ahoraMs:           number;
  onToggleItem:      (item: PedidoItem) => void;
  onMarcarTodoListo: (pedidoId: string) => void;
  itemsProcesando:   Set<string>;
}) {
  const { pedido, pendientes, listos } = ticket;
  const mesa      = pedido.mesa;
  const minutos   = minutosDesde(ticket.inicio, ahoraMs);
  const urgencia  = cfgUrgencia(minutos);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: B.white, border: `1.5px solid ${urgencia.color}40` }}
    >
      {/* Header ticket */}
      <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ background: urgencia.bg }}>
        <div className="min-w-0">
          <p className="text-sm font-black truncate" style={{ color: B.charcoal }}>
            {mesa?.nombre ?? `Mesa ${mesa?.numero ?? '—'}`}
          </p>
          <p className="text-[11px]" style={{ color: B.muted }}>
            {mesa?.zona ?? ''} · {fmtHora(pedido.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full shrink-0" style={{ background: `${urgencia.color}20` }}>
          <Clock className="w-3.5 h-3.5" style={{ color: urgencia.color }} />
          <span className="text-xs font-black" style={{ color: urgencia.color }}>{minutos} min</span>
        </div>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2 flex-1">
        {pendientes.map(item => (
          <ItemRow key={item.id} item={item} onToggle={onToggleItem} procesando={itemsProcesando.has(item.id)} />
        ))}
        {listos.map(item => (
          <ItemRow key={item.id} item={item} onToggle={onToggleItem} procesando={itemsProcesando.has(item.id)} />
        ))}
      </div>

      {/* Footer */}
      {pendientes.length > 0 && (
        <div className="p-3 pt-0">
          <button
            onClick={() => onMarcarTodoListo(pedido.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: B.green, color: B.cream }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Marcar pedido listo ({pendientes.length})
          </button>
        </div>
      )}
      {pendientes.length === 0 && listos.length > 0 && (
        <div className="px-3 pb-3">
          <div
            className="flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 rounded-lg"
            style={{ color: B.green, background: '#e8f5e2' }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Listo, esperando que lo recojan
          </div>
        </div>
      )}
    </div>
  );
}

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