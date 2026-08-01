// context/GlobalDataContext.tsx
'use client';

import React, {
  createContext, useContext, useEffect, useState,
  useCallback, useMemo, useRef,
} from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getProductos, getMesasConPedido, getClientes, getCajas,
  getVentasHoy, getVentasRecientes, getVentasSemana, getVentasMes,
  getComprobantes, getCompras, getUsuarios,
  getProduccionHoy, getNotificacionesSinLeer, getPedidosCocina,
  getMetricasDashboard, getTopProductosHoy,
  type MetricasDashboard, type TopProductoHoy,
} from '@/lib/supabase/queries';
import type {
  Mesa, Cliente, Caja, Venta, Pedido, PedidoItem,
  Compra, ProduccionCocina, Usuario, Notificacion,
} from '@/lib/supabase/types';
import type { Producto as Producto } from '@/lib/supabase/types';
import { supabase } from '@/lib/supabase/client';
import { playNotificationSound } from '@/utils/notificaciones/playNotificationSound';

type ComprobanteDetalle = Awaited<ReturnType<typeof getComprobantes>>[number];

interface GlobalDataContextType {
  productos:           Producto[];
  mesas:               Mesa[];
  clientes:            Cliente[];
  cajas:               Caja[];
  ventasHoy:           Venta[];
  ventasRecientes:     Venta[];
  ventasSemana:        Array<{ total: number; fecha_local: string }>;
  ventasMes:           Array<{ total: number; fecha_local: string }>;
  comprobantes:        ComprobanteDetalle[];
  compras:             Compra[];
  produccionHoy:       ProduccionCocina[];
  pedidosCocina:       Pedido[];
  usuarios:            Usuario[];
  notificaciones:      Notificacion[];
  metricas:            MetricasDashboard | null;
  topProductosHoy:     TopProductoHoy[];
  isLoading:           boolean;
  isLoadingComplete:   boolean;
  refetchProductos:        () => Promise<void>;
  refetchMesas:            () => Promise<void>;
  refetchClientes:         () => Promise<void>;
  refetchCajas:            () => Promise<void>;
  refetchVentas:           () => Promise<void>;
  refetchVentasRecientes:  () => Promise<void>;
  refetchVentasMes:        () => Promise<void>;
  refetchComprobantes:     () => Promise<void>;
  refetchCompras:          () => Promise<void>;
  refetchProduccion:       () => Promise<void>;
  refetchPedidosCocina:    () => Promise<void>;
  refetchUsuarios:         () => Promise<void>;
  refetchNotificaciones:   () => Promise<void>;
  refetchMetricas:         () => Promise<void>;
  refetchTopProductos:     () => Promise<void>;
  refetchAll:              () => Promise<void>;
  /** Actualiza una mesa en memoria al instante (sin red). Usar para UI
   *  optimista al cambiar de estado; el realtime/refetch ya se encarga de
   *  reconciliar con el valor real cuando la respuesta llegue. */
  actualizarMesaLocal:     (id: string, cambios: Partial<Mesa>) => void;
}

const GlobalDataContext = createContext<GlobalDataContextType | null>(null);

export function useGlobalData() {
  const ctx = useContext(GlobalDataContext);
  if (!ctx) throw new Error('useGlobalData debe usarse dentro de <GlobalDataProvider>');
  return ctx;
}

export function GlobalDataProvider({ children }: { children: React.ReactNode }) {
  // ── Estado ────────────────────────────────────────────────────────────────
  const [productos,        setProductos]        = useState<Producto[]>([]);
  const [mesas,            setMesas]            = useState<Mesa[]>([]);
  const [clientes,         setClientes]         = useState<Cliente[]>([]);
  const [cajas,            setCajas]            = useState<Caja[]>([]);
  const [ventasHoy,        setVentasHoy]        = useState<Venta[]>([]);
  const [ventasRecientes,  setVentasRecientes]  = useState<Venta[]>([]);
  const [ventasSemana,     setVentasSemana]     = useState<Array<{ total: number; fecha_local: string }>>([]);
  const [ventasMes,        setVentasMes]        = useState<Array<{ total: number; fecha_local: string }>>([]);
  const [comprobantes,     setComprobantes]     = useState<ComprobanteDetalle[]>([]);
  const [compras,          setCompras]          = useState<Compra[]>([]);
  const [produccionHoy,    setProduccionHoy]    = useState<ProduccionCocina[]>([]);
  const [pedidosCocina,    setPedidosCocina]    = useState<Pedido[]>([]);
  const [usuarios,         setUsuarios]         = useState<Usuario[]>([]);
  const [notificaciones,   setNotificaciones]   = useState<Notificacion[]>([]);
  const [metricas,         setMetricas]         = useState<MetricasDashboard | null>(null);
  const [topProductosHoy,  setTopProductosHoy]  = useState<TopProductoHoy[]>([]);
  const [isLoading,          setIsLoading]          = useState(true);
  const [isLoadingComplete,  setIsLoadingComplete]  = useState(false);

  const { usuario: usuarioActual, loading: authLoading } = useAuth();
  const usuarioActualRef = useRef<typeof usuarioActual>(null);
  useEffect(() => { usuarioActualRef.current = usuarioActual; }, [usuarioActual]);

  const cargaIniciadaRef = useRef(false);

  // ── Fetches individuales ───────────────────────────────────────────────────
  const refetchProductos = useCallback(async () => {
    try { setProductos(await getProductos()); }
    catch (e) { console.error('productos:', e); }
  }, []);

  // FIX DELAY MESAS: `mesas` UPDATE, `pedidos` * y `pedido_items` * disparan
  // refetchMesas() cada uno por su lado. Cuando dos de esos eventos llegan
  // casi juntos (ej. abrir mesa = INSERT en pedidos + UPDATE en mesas),
  // salían DOS requests a getMesasConPedido() en paralelo. Si el primero en
  // salir tardaba más en responder que el segundo (la red no garantiza el
  // orden de respuesta), su resultado — más viejo — llegaba último y
  // pisaba el estado ya actualizado, dejando la mesa "atrasada" en pantalla
  // hasta el próximo evento o el poll de 30s. Con este contador, cada
  // llamada se marca con un id; si al resolver ya no es la más reciente en
  // vuelo, se descarta en vez de aplicarse.
  const mesasFetchIdRef = useRef(0);
  const refetchMesas = useCallback(async () => {
    const fetchId = ++mesasFetchIdRef.current;
    try {
      const data = await getMesasConPedido();
      if (fetchId !== mesasFetchIdRef.current) return; // llegó una más nueva antes: descartar
      const seen = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unicas = (data as any[]).filter((m: { id: string }) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      setMesas(unicas);
    }
    catch (e) { console.error('mesas:', e); }
  }, []);

  // FIX DELAY MESAS (2/2): actualización optimista en memoria. Antes, cambiar
  // el estado de una mesa esperaba el UPDATE en Supabase y LUEGO hacía un
  // refetch completo de `v_mesas_con_pedido` (un segundo round-trip) antes de
  // que la UI mostrara el nuevo estado — de ahí el "retraso" al pasar de
  // ocupada a limpieza, etc. Con esto, quien dispara el cambio (MesasView)
  // puede pintar el nuevo estado al instante; el UPDATE real y el realtime
  // siguen corriendo igual y corrigen la UI si algo no coincide.
  const actualizarMesaLocal = useCallback((id: string, cambios: Partial<Mesa>) => {
    setMesas(prev => prev.map(m => (m.id === id ? { ...m, ...cambios } : m)));
  }, []);

  const refetchClientes = useCallback(async () => {
    try { setClientes(await getClientes()); }
    catch (e) { console.error('clientes:', e); }
  }, []);

  const refetchCajas = useCallback(async () => {
    try { setCajas(await getCajas()); }
    catch (e) { console.error('cajas:', e); }
  }, []);

  const refetchComprobantes = useCallback(async () => {
    try { setComprobantes(await getComprobantes()); }
    catch (e) { console.error('comprobantes:', e); }
  }, []);

  const refetchCompras = useCallback(async () => {
    try { setCompras(await getCompras()); }
    catch (e) { console.error('compras:', e); }
  }, []);

  const refetchProduccion = useCallback(async () => {
    try { setProduccionHoy(await getProduccionHoy()); }
    catch (e) { console.error('produccion:', e); }
  }, []);

  // Tickets activos del KDS de cocina (pedidos con items enviado_cocina/listo).
  // Antes vivía como estado local de CocinaView y se recargaba desde cero
  // (con spinner) cada vez que se montaba el componente al navegar. Al vivir
  // aquí, en el contexto global, los datos sobreviven al cambio de vista —
  // igual que mesas, cajas, etc. — y CocinaView no vuelve a mostrar el
  // loader al volver a entrar a la sección.
  // Mismo problema y mismo fix que refetchMesas: `pedidos` y `pedido_items`
  // disparan este refetch al mismo tiempo cuando cocina marca un item listo.
  const pedidosCocinaFetchIdRef = useRef(0);
  const refetchPedidosCocina = useCallback(async () => {
    const fetchId = ++pedidosCocinaFetchIdRef.current;
    try {
      const data = await getPedidosCocina();
      if (fetchId !== pedidosCocinaFetchIdRef.current) return;
      setPedidosCocina(data);
    }
    catch (e) { console.error('pedidosCocina:', e); }
  }, []);

  const refetchUsuarios = useCallback(async () => {
    try { setUsuarios(await getUsuarios()); }
    catch (e) { console.error('usuarios:', e); }
  }, []);

  const refetchMetricas = useCallback(async () => {
    try { setMetricas(await getMetricasDashboard()); }
    catch (e) { console.error('metricas:', e); }
  }, []);

  const refetchTopProductos = useCallback(async () => {
    try { setTopProductosHoy(await getTopProductosHoy()); }
    catch (e) { console.error('topProductos:', e); }
  }, []);

  const refetchVentas = useCallback(async () => {
    try {
      const [hoy, semana] = await Promise.all([getVentasHoy(), getVentasSemana()]);
      setVentasHoy(hoy);
      setVentasSemana(semana);
    } catch (e) { console.error('ventas:', e); }
  }, []);

  const refetchVentasRecientes = useCallback(async () => {
    try { setVentasRecientes(await getVentasRecientes(10)); }
    catch (e) { console.error('ventasRecientes:', e); }
  }, []);

  const refetchVentasMes = useCallback(async () => {
    try { setVentasMes(await getVentasMes()); }
    catch (e) { console.error('ventasMes:', e); }
  }, []);

  const refetchNotificaciones = useCallback(async () => {
    const uid = usuarioActualRef.current?.id;
    if (!uid) return;
    try { setNotificaciones(await getNotificacionesSinLeer(uid)); }
    catch (e) { console.error('notificaciones:', e); }
  }, []);

  // ── Carga lazy por fases ───────────────────────────────────────────────────
  const refetchAll = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingComplete(false);

    await Promise.allSettled([
      refetchMesas(),
      refetchVentas(),
      refetchPedidosCocina(),
    ]);
    setIsLoading(false);

    Promise.allSettled([
      refetchProductos(),
      refetchVentasRecientes(),
      refetchVentasMes(),
      refetchClientes(),
      refetchCajas(),
      refetchMetricas(),
      refetchTopProductos(),
    ]).then(() => {
      Promise.allSettled([
        refetchComprobantes(),
        refetchCompras(),
        refetchProduccion(),
        refetchUsuarios(),
      ]).then(() => setIsLoadingComplete(true));
    });
  }, [
    refetchMesas, refetchVentas, refetchPedidosCocina,
    refetchProductos, refetchVentasRecientes, refetchVentasMes, refetchClientes,
    refetchCajas, refetchMetricas, refetchTopProductos,
    refetchComprobantes, refetchCompras, refetchProduccion, refetchUsuarios,
  ]);

  // ── Carga inicial (una sola vez) ───────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return; // AuthContext aún resolviendo la sesión

    if (usuarioActual && !cargaIniciadaRef.current) {
      cargaIniciadaRef.current = true;
      refetchAll();
    }

    if (!usuarioActual) {
      cargaIniciadaRef.current = false;
    }
  }, [usuarioActual, authLoading, refetchAll]);

  // ── Poll de respaldo para mesas ─────────────────────────────────────────────
  // El realtime a veces se queda "dormido" en pestañas/websockets inactivos;
  // este refresco cada 8s garantiza que la vista de mesas nunca se quede
  // pegada por mucho tiempo, sin reemplazar el realtime (que sigue siendo
  // instantáneo cuando funciona, y ahora se reconecta solo si se cae — ver
  // el canal más abajo). Se usa refetchMesas directamente (ya es estable vía
  // useCallback con deps vacías) — sin pasar por un ref, para no chocar con
  // el ref que ya usa el canal Realtime más abajo.
  useEffect(() => {
    if (!usuarioActual) return;
    const poll = setInterval(() => { refetchMesas(); }, 8_000);
    return () => clearInterval(poll);
  }, [usuarioActual, refetchMesas]);

  // ── Poll de respaldo para cocina (mismo motivo que el de mesas) ───────────
  useEffect(() => {
    if (!usuarioActual) return;
    const poll = setInterval(() => { refetchPedidosCocina(); }, 30_000);
    return () => clearInterval(poll);
  }, [usuarioActual, refetchPedidosCocina]);

  // ── Poll de respaldo para comprobantes ──────────────────────────────────────
  // Mismo motivo que el de mesas: antes esto dependía 100% del socket de
  // Realtime, sin ningún respaldo — de ahí que a veces el comprobante recién
  // emitido no apareciera hasta recargar la página a mano.
  useEffect(() => {
    if (!usuarioActual) return;
    const poll = setInterval(() => { refetchComprobantes(); }, 15_000);
    return () => clearInterval(poll);
  }, [usuarioActual, refetchComprobantes]);

  // ── Refs estables para el canal Realtime ──────────────────────────────────
  const refetchProductosRef       = useRef(refetchProductos);
  const refetchMesasRef           = useRef(refetchMesas);
  const refetchNotificacionesRef  = useRef(refetchNotificaciones);
  const refetchUsuariosRef        = useRef(refetchUsuarios);
  const refetchClientesRef        = useRef(refetchClientes);
  const refetchCajasRef           = useRef(refetchCajas);
  const refetchComprobantesRef    = useRef(refetchComprobantes);
  const refetchTopProductosRef    = useRef(refetchTopProductos);
  const refetchVentasRef          = useRef(refetchVentas);
  const refetchVentasRecientesRef = useRef(refetchVentasRecientes);
  const refetchVentasMesRef       = useRef(refetchVentasMes);
  const refetchMetricasRef        = useRef(refetchMetricas);
  const refetchPedidosCocinaRef   = useRef(refetchPedidosCocina);

  useEffect(() => { refetchProductosRef.current       = refetchProductos;       }, [refetchProductos]);
  useEffect(() => { refetchMesasRef.current           = refetchMesas;           }, [refetchMesas]);
  useEffect(() => { refetchNotificacionesRef.current  = refetchNotificaciones;  }, [refetchNotificaciones]);
  useEffect(() => { refetchUsuariosRef.current        = refetchUsuarios;        }, [refetchUsuarios]);
  useEffect(() => { refetchClientesRef.current        = refetchClientes;        }, [refetchClientes]);
  useEffect(() => { refetchCajasRef.current           = refetchCajas;           }, [refetchCajas]);
  useEffect(() => { refetchComprobantesRef.current    = refetchComprobantes;    }, [refetchComprobantes]);
  useEffect(() => { refetchTopProductosRef.current    = refetchTopProductos;    }, [refetchTopProductos]);
  useEffect(() => { refetchVentasRef.current          = refetchVentas;          }, [refetchVentas]);
  useEffect(() => { refetchVentasRecientesRef.current = refetchVentasRecientes; }, [refetchVentasRecientes]);
  useEffect(() => { refetchVentasMesRef.current       = refetchVentasMes;       }, [refetchVentasMes]);
  useEffect(() => { refetchMetricasRef.current        = refetchMetricas;        }, [refetchMetricas]);
  useEffect(() => { refetchPedidosCocinaRef.current   = refetchPedidosCocina;   }, [refetchPedidosCocina]);

  // ── Debounce compartido para colapsar ráfagas de eventos Realtime ─────────
  // Abrir una mesa dispara un INSERT en `pedidos` + un UPDATE en `mesas` casi
  // juntos; enviar 4 productos a cocina dispara 4 INSERT en `pedido_items`
  // seguidos. Antes, cada uno de esos eventos llamaba a su refetch pesado
  // (con joins) por separado y en paralelo — N requests compitiendo entre sí
  // por la misma data, lo que en la práctica ATRASABA más la actualización
  // que un solo fetch (más notorio en cocina, cuyo query es más pesado:
  // pedidos + items + productos + mesas). Ahora, los eventos que llegan
  // dentro de la misma ráfaga (150ms) colapsan en una sola llamada.
  const debounceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const refetchDebounced = useCallback((key: string, fn: () => void, delay = 150) => {
    if (debounceTimersRef.current[key]) clearTimeout(debounceTimersRef.current[key]);
    debounceTimersRef.current[key] = setTimeout(fn, delay);
  }, []);

  // ── Canal Realtime único ──────────────────────────────────────────────────
  useEffect(() => {
    const canal = supabase
      .channel('global-realtime')

      // ── PRODUCTOS ──────────────────────────────────────────────────────
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'productos' },
        () => refetchProductosRef.current()
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'productos' },
        () => refetchProductosRef.current()
      )

      // ── MESAS ────────────────────────────────────────────────────────────
      // FIX DELAY ENTRE SESIONES (cajero ↔ admin): antes, este handler solo
      // disparaba refetchMesasRef.current() — un round-trip de red completo
      // a getMesasConPedido() (vista con joins). En la pestaña que originó
      // el cambio, actualizarMesaLocal() ya pinta el nuevo estado al
      // instante (ver MesasView/TomaPedido); pero en CUALQUIER OTRA sesión
      // (ej. admin viendo la mesa que el cajero acaba de ocupar), no había
      // optimismo: había que esperar a que ese refetch completo terminara
      // para recién ver 'ocupada'. Ese es el "milisegundo" de retraso que
      // abre la ventana para que dos usuarios intenten tomar la misma mesa.
      // Ahora, el payload que ya trae el propio evento Realtime (payload.new
      // con id/estado/pedido_id, etc. — columnas reales de `mesas`) se
      // aplica de inmediato sobre el estado en memoria, igual que hace
      // actualizarMesaLocal, ANTES de disparar el refetch de reconciliación
      // (que sigue corriendo en segundo plano para traer pedido_activo y
      // demás datos del join, sin bloquear el ícono/estado visible).
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mesas' },
        (payload) => {
          const actualizada = payload.new as Mesa;
          setMesas(prev =>
            prev.map(m => (m.id === actualizada.id ? { ...m, ...actualizada } : m))
          );
          refetchMesasRef.current();
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mesas' },
        () => refetchMesasRef.current()
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mesas' },
        (payload) => { setMesas(prev => prev.filter(m => m.id !== payload.old.id)); }
      )

      // ── PEDIDOS → refetch mesas + tickets de cocina ──────────────────────
      // FIX CASCADA: se agrupan (debounce, ver arriba) las ráfagas de eventos
      // en vez de disparar un refetch pesado por cada fila que cambia.
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          refetchDebounced('mesas', () => refetchMesasRef.current());
          refetchDebounced('pedidosCocina', () => refetchPedidosCocinaRef.current());
        }
      )

      // ── PEDIDO_ITEMS → actualiza cocina ───────────────────────────────────
      // Antes lo escuchaba un canal aparte ('kds-cocina') dentro de
      // CocinaView.tsx; se centraliza aquí junto con el resto del realtime.
      // FIX: en vez de esperar SIEMPRE el refetch completo (pesado: pedidos +
      // items + productos + mesas) para reflejar un cambio de estado de item
      // (ej. cocina marca "listo"), se aplica de inmediato sobre el ticket ya
      // en memoria — así todas las sesiones (cajero, admin, otra pantalla de
      // cocina) lo ven al toque. El refetch (debounced) sigue corriendo
      // detrás para reconciliar totales o items nuevos que no están en el
      // payload (ej. join con producto).
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pedido_items' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const item = payload.new as PedidoItem;
            setPedidosCocina(prev =>
              prev.map(p =>
                p.id === item.pedido_id
                  ? { ...p, items: (p.items ?? []).map(i => (i.id === item.id ? { ...i, ...item } : i)) }
                  : p
              )
            );
          }
          refetchDebounced('pedidosCocina', () => refetchPedidosCocinaRef.current());
        }
      )

      // ── VENTAS INSERT ────────────────────────────────────────────────────
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ventas' },
        (payload) => {
          const nueva = payload.new as Venta;
          const hoyLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
          if (nueva.fecha_local === hoyLima && nueva.estado === 'completada') {
            setVentasHoy(prev => [nueva, ...prev]);
          }
          if (nueva.estado === 'completada') {
            setTimeout(() => {
              refetchVentasRecientesRef.current();
              refetchMetricasRef.current();
              refetchTopProductosRef.current();
            }, 800);
          }
          setVentasSemana(prev => [
            ...prev,
            { total: nueva.total ?? 0, fecha_local: nueva.fecha_local },
          ]);
          setVentasMes(prev => [
            ...prev,
            { total: nueva.total ?? 0, fecha_local: nueva.fecha_local },
          ]);
        }
      )

      // ── VENTAS UPDATE (anulación) ─────────────────────────────────────────
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ventas' },
        (payload) => {
          const actualizada = payload.new as Venta;

          setVentasHoy(prev =>
            prev.map(v => v.id === actualizada.id ? { ...v, ...actualizada } : v)
          );
          setVentasRecientes(prev =>
            prev.map(v => v.id === actualizada.id ? { ...v, ...actualizada } : v)
          );

          if (actualizada.estado === 'anulada') {
            setTimeout(() => {
              Promise.allSettled([
                refetchVentasRef.current(),
                refetchVentasRecientesRef.current(),
                refetchVentasMesRef.current(),
                refetchMetricasRef.current(),
                refetchTopProductosRef.current(),
                refetchComprobantesRef.current(),
                refetchProductosRef.current(),
              ]);
            }, 500);

            setVentasHoy(prev => {
              const ventasActivas = prev
                .map(v => v.id === actualizada.id ? { ...v, ...actualizada } : v)
                .filter(v => v.estado === 'completada');
              const total = ventasActivas.reduce((s, v) => s + (v.total ?? 0), 0);
              setMetricas(m => m ? {
                ...m,
                ventasHoy:      total,
                transacciones:  ventasActivas.length,
                ticketPromedio: ventasActivas.length > 0 ? total / ventasActivas.length : 0,
              } : m);
              return prev.map(v => v.id === actualizada.id ? { ...v, ...actualizada } : v);
            });
          }
        }
      )

      // ── NOTIFICACIONES INSERT ───────────────────────────────────────────
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (payload) => {
          const uid   = usuarioActualRef.current?.id;
          const rol   = usuarioActualRef.current?.rol;
          const notif = payload.new as Notificacion;
          if (!notif.usuario_id || notif.usuario_id === uid) {
            setNotificaciones(prev => [notif, ...prev.slice(0, 19)]);

            if (notif.tipo === 'pedido_listo' && (rol === 'cajero' || rol === 'admin')) {
              playNotificationSound();
            }
          }
        }
      )
      // ── NOTIFICACIONES UPDATE (alguien la marcó como leída) ───────────────
      // Sin esto, cuando un usuario marca "Listo, entendido", los demás
      // clientes (incluido él mismo en otra pestaña) nunca se enteran y la
      // campana sigue mostrando la notificación como pendiente.
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notificaciones' },
        (payload) => {
          const actualizada = payload.new as Notificacion;
          if (actualizada.leida) {
            setNotificaciones(prev => prev.filter(n => n.id !== actualizada.id));
          }
        }
      )

      // ── CLIENTES ─────────────────────────────────────────────────────────
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clientes' },
        (payload) => {
          setClientes(prev =>
            prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)
          );
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'clientes' },
        () => refetchClientesRef.current()
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'clientes' },
        (payload) => {
          setClientes(prev => prev.filter(c => c.id !== payload.old.id));
        }
      )

      // ── CAJAS ────────────────────────────────────────────────────────────
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cajas' },
        (payload) => {
          setCajas(prev =>
            prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)
          );
          refetchUsuariosRef.current();
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cajas' },
          () => {
          refetchCajasRef.current();
          refetchUsuariosRef.current();
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'cajas' },
        (payload) => {
          setCajas(prev => prev.filter(c => c.id !== payload.old.id));
          refetchUsuariosRef.current();
        }
      )

      // ── USUARIOS ─────────────────────────────────────────────────────────
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'usuarios' },
        () => refetchUsuariosRef.current()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'usuarios' },
          () => {
            refetchUsuariosRef.current();
            refetchCajasRef.current();
          }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'usuarios' },
        (payload) => {
          setUsuarios(prev => prev.filter(u => u.id !== payload.old.id));
        }
      )

      // ── COMPROBANTES ─────────────────────────────────────────────────────
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'comprobantes' },
        () => refetchComprobantesRef.current()
      )

      .subscribe((status) => {
        // FIX DELAY ENTRE PESTAÑAS/USUARIOS: el WebSocket de Realtime puede
        // "dormirse" o cortarse en silencio (pestaña de fondo, blip de red,
        // etc.) sin que el navegador lo note — quien generó el cambio lo ve
        // al toque porque acaba de escribir; el resto de usuarios depende
        // 100% de este socket, y si murió, antes solo se enteraban con el
        // poll de respaldo (cada 30s). Ahora, si el canal se cae, se
        // reintenta la suscripción enseguida en vez de esperar al poll.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setTimeout(() => { canal.subscribe(); }, 1000);
        }
      });

    // Red de seguridad adicional: si el canal estaba dormido y la pestaña
    // recupera el foco (o vuelve la conexión), se refresca al toque en vez
    // de esperar al poll de 30s. Cubre el caso de tener dos ventanas abiertas
    // (ej. admin y cajero) donde una queda sin foco.
    //
    // FIX COMPROBANTES: `comprobantes` (y ventas recientes / cajas) no tenían
    // NINGÚN respaldo — dependían 100% del socket de Realtime. Si se dormía
    // justo al cobrar, el comprobante recién creado no aparecía hasta
    // recargar la página a mano. Se agregan aquí, igual que ya se hizo con
    // mesas/cocina.
    const refrescarAlVolver = () => {
      refetchMesasRef.current();
      refetchPedidosCocinaRef.current();
      refetchComprobantesRef.current();
      refetchVentasRecientesRef.current();
      refetchVentasRef.current();
      refetchCajasRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refrescarAlVolver();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refrescarAlVolver);
    window.addEventListener('online', refrescarAlVolver);

    return () => {
      supabase.removeChannel(canal);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refrescarAlVolver);
      window.removeEventListener('online', refrescarAlVolver);
    };
  }, [refetchDebounced]);

  // ── Valor del contexto ────────────────────────────────────────────────────
  const value = useMemo<GlobalDataContextType>(() => ({
    productos, mesas, clientes, cajas,
    ventasHoy, ventasRecientes, ventasSemana, ventasMes,
    comprobantes, compras, produccionHoy, pedidosCocina, usuarios, notificaciones,
    metricas, topProductosHoy,
    isLoading, isLoadingComplete,
    refetchProductos, refetchMesas, refetchClientes, refetchCajas,
    refetchVentas, refetchVentasRecientes, refetchVentasMes, refetchComprobantes,
    refetchCompras, refetchProduccion, refetchPedidosCocina, refetchUsuarios,
    refetchNotificaciones, refetchMetricas, refetchTopProductos,
    refetchAll, actualizarMesaLocal,
  }), [
    productos, mesas, clientes, cajas,
    ventasHoy, ventasRecientes, ventasSemana, ventasMes,
    comprobantes, compras, produccionHoy, pedidosCocina, usuarios, notificaciones,
    metricas, topProductosHoy,
    isLoading, isLoadingComplete,
    refetchProductos, refetchMesas, refetchClientes, refetchCajas,
    refetchVentas, refetchVentasRecientes, refetchVentasMes, refetchComprobantes,
    refetchCompras, refetchProduccion, refetchPedidosCocina, refetchUsuarios,
    refetchNotificaciones, refetchMetricas, refetchTopProductos,
    refetchAll, actualizarMesaLocal,
  ]);

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
}