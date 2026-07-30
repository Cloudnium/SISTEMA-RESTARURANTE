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
  Mesa, Cliente, Caja, Venta, Pedido,
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
  // este refresco cada 30s garantiza que la vista de mesas nunca se quede
  // pegada indefinidamente, sin reemplazar el realtime (que sigue siendo
  // instantáneo cuando funciona). Se usa refetchMesas directamente (ya es
  // estable vía useCallback con deps vacías) — sin pasar por un ref, para no
  // chocar con el ref que ya usa el canal Realtime más abajo.
  useEffect(() => {
    if (!usuarioActual) return;
    const poll = setInterval(() => { refetchMesas(); }, 30_000);
    return () => clearInterval(poll);
  }, [usuarioActual, refetchMesas]);

  // ── Poll de respaldo para cocina (mismo motivo que el de mesas) ───────────
  useEffect(() => {
    if (!usuarioActual) return;
    const poll = setInterval(() => { refetchPedidosCocina(); }, 30_000);
    return () => clearInterval(poll);
  }, [usuarioActual, refetchPedidosCocina]);

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
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mesas' },
        () => refetchMesasRef.current()
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
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          refetchMesasRef.current();
          refetchPedidosCocinaRef.current();
        }
      )

      // ── PEDIDO_ITEMS → refetch tickets de cocina ─────────────────────────
      // Antes lo escuchaba un canal aparte ('kds-cocina') dentro de
      // CocinaView.tsx; se centraliza aquí junto con el resto del realtime.
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pedido_items' },
        () => refetchPedidosCocinaRef.current()
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

      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, []);

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
    refetchAll,
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
    refetchAll,
  ]);

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
}