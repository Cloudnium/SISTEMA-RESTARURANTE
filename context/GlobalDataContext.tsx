// context/GlobalDataContext.tsx
'use client';

import React, {
  createContext, useContext, useEffect, useState,
  useCallback, useMemo, useRef,
} from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getProductos, getMesasConPedido, getClientes, getCajas,
  getVentasHoy, getVentasRecientes, getVentasSemana,
  getComprobantes, getCompras, getUsuarios,
  getProduccionHoy, getNotificacionesSinLeer,
  getMetricasDashboard, getTopProductosHoy,
  type MetricasDashboard, type TopProductoHoy,
} from '@/lib/supabase/queries';
import type {
  Mesa, Cliente, Caja, Venta,
  Compra, ProduccionCocina, Usuario, Notificacion,
} from '@/lib/supabase/types';
import type { Producto as Producto } from '@/lib/supabase/types';
import { supabase } from '@/lib/supabase/client';

type ComprobanteDetalle = Awaited<ReturnType<typeof getComprobantes>>[number];

interface GlobalDataContextType {
  productos:           Producto[];
  mesas:               Mesa[];
  clientes:            Cliente[];
  cajas:               Caja[];
  ventasHoy:           Venta[];
  ventasRecientes:     Venta[];
  ventasSemana:        Array<{ total: number; fecha_local: string }>;
  comprobantes:        ComprobanteDetalle[];
  compras:             Compra[];
  produccionHoy:       ProduccionCocina[];
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
  refetchComprobantes:     () => Promise<void>;
  refetchCompras:          () => Promise<void>;
  refetchProduccion:       () => Promise<void>;
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
  const [comprobantes,     setComprobantes]     = useState<ComprobanteDetalle[]>([]);
  const [compras,          setCompras]          = useState<Compra[]>([]);
  const [produccionHoy,    setProduccionHoy]    = useState<ProduccionCocina[]>([]);
  const [usuarios,         setUsuarios]         = useState<Usuario[]>([]);
  const [notificaciones,   setNotificaciones]   = useState<Notificacion[]>([]);
  const [metricas,         setMetricas]         = useState<MetricasDashboard | null>(null);
  const [topProductosHoy,  setTopProductosHoy]  = useState<TopProductoHoy[]>([]);
  const [isLoading,          setIsLoading]          = useState(true);
  const [isLoadingComplete,  setIsLoadingComplete]  = useState(false);

  const { usuario: usuarioActual } = useAuth();
  const usuarioActualRef = useRef<typeof usuarioActual>(null);
  useEffect(() => { usuarioActualRef.current = usuarioActual; }, [usuarioActual]);

  const cargaIniciadaRef = useRef(false);

  // ── Fetches individuales ───────────────────────────────────────────────────
  const refetchProductos = useCallback(async () => {
    try { setProductos(await getProductos()); }
    catch (e) { console.error('productos:', e); }
  }, []);

  const refetchMesas = useCallback(async () => {
    try {
      const data = await getMesasConPedido();
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
    ]);
    setIsLoading(false);

    Promise.allSettled([
      refetchProductos(),
      refetchVentasRecientes(),
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
    refetchMesas, refetchVentas,
    refetchProductos, refetchVentasRecientes, refetchClientes,
    refetchCajas, refetchMetricas, refetchTopProductos,
    refetchComprobantes, refetchCompras, refetchProduccion, refetchUsuarios,
  ]);

  // ── Carga inicial (una sola vez) ───────────────────────────────────────────
  useEffect(() => {
    if (cargaIniciadaRef.current) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !cargaIniciadaRef.current) {
        cargaIniciadaRef.current = true;
        refetchAll();
      }
      if (event === 'SIGNED_OUT') {
        cargaIniciadaRef.current = false;
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !cargaIniciadaRef.current) {
        cargaIniciadaRef.current = true;
        refetchAll();
      }
    });

    return () => subscription.unsubscribe();
  }, [refetchAll]);

  // ── Refs estables para el canal Realtime ──────────────────────────────────
  const refetchProductosRef       = useRef(refetchProductos);       // ← FIX: ref para productos
  const refetchMesasRef           = useRef(refetchMesas);
  const refetchNotificacionesRef  = useRef(refetchNotificaciones);
  const refetchUsuariosRef        = useRef(refetchUsuarios);
  const refetchClientesRef        = useRef(refetchClientes);
  const refetchCajasRef           = useRef(refetchCajas);
  const refetchComprobantesRef    = useRef(refetchComprobantes);
  const refetchTopProductosRef    = useRef(refetchTopProductos);
  const refetchVentasRef          = useRef(refetchVentas);
  const refetchVentasRecientesRef = useRef(refetchVentasRecientes);
  const refetchMetricasRef        = useRef(refetchMetricas);

  useEffect(() => { refetchProductosRef.current       = refetchProductos;       }, [refetchProductos]);  // ← FIX
  useEffect(() => { refetchMesasRef.current           = refetchMesas;           }, [refetchMesas]);
  useEffect(() => { refetchNotificacionesRef.current  = refetchNotificaciones;  }, [refetchNotificaciones]);
  useEffect(() => { refetchUsuariosRef.current        = refetchUsuarios;        }, [refetchUsuarios]);
  useEffect(() => { refetchClientesRef.current        = refetchClientes;        }, [refetchClientes]);
  useEffect(() => { refetchCajasRef.current           = refetchCajas;           }, [refetchCajas]);
  useEffect(() => { refetchComprobantesRef.current    = refetchComprobantes;    }, [refetchComprobantes]);
  useEffect(() => { refetchTopProductosRef.current    = refetchTopProductos;    }, [refetchTopProductos]);
  useEffect(() => { refetchVentasRef.current          = refetchVentas;          }, [refetchVentas]);
  useEffect(() => { refetchVentasRecientesRef.current = refetchVentasRecientes; }, [refetchVentasRecientes]);
  useEffect(() => { refetchMetricasRef.current        = refetchMetricas;        }, [refetchMetricas]);

  // ── Canal Realtime único ──────────────────────────────────────────────────
  useEffect(() => {
    const canal = supabase
      .channel('global-realtime')

      // ── PRODUCTOS → refetch cuando BD descuenta/restaura stock ───────────
      // El trigger de BD modifica stock_tienda directamente en la tabla,
      // por eso necesitamos escuchar UPDATE aquí para reflejar el cambio.
      // Requiere: ALTER PUBLICATION supabase_realtime ADD TABLE public.productos;
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
        (payload) => {
          setMesas(prev =>
            prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)
          );
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

      // ── PEDIDOS → refetch mesas ──────────────────────────────────────────
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => refetchMesasRef.current()
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
            // ← CAMBIO: refetch con delay para que el trigger de comprobante termine
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
            // Refetch completo con delay para que los triggers de BD terminen
            setTimeout(() => {
              Promise.allSettled([
                refetchVentasRef.current(),
                refetchVentasRecientesRef.current(),
                refetchMetricasRef.current(),
                refetchTopProductosRef.current(),
                refetchComprobantesRef.current(),   // ← FIX: actualiza página comprobantes
                refetchProductosRef.current(),      // ← FIX: restaura stock en catálogo
              ]);
            }, 500);

            // Actualización optimista inmediata de métricas
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

      // ── NOTIFICACIONES ───────────────────────────────────────────────────
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (payload) => {
          const uid   = usuarioActualRef.current?.id;
          const notif = payload.new as Notificacion;
          if (!notif.usuario_id || notif.usuario_id === uid) {
            setNotificaciones(prev => [notif, ...prev.slice(0, 19)]);
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
          refetchUsuariosRef.current(); // ← AGREGAR
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'cajas' },
        (payload) => {
          setCajas(prev => prev.filter(c => c.id !== payload.old.id));
          refetchUsuariosRef.current(); // ← AGREGAR
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
            refetchCajasRef.current(); // ← AGREGAR
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
    ventasHoy, ventasRecientes, ventasSemana,
    comprobantes, compras, produccionHoy, usuarios, notificaciones,
    metricas, topProductosHoy,
    isLoading, isLoadingComplete,
    refetchProductos, refetchMesas, refetchClientes, refetchCajas,
    refetchVentas, refetchVentasRecientes, refetchComprobantes,
    refetchCompras, refetchProduccion, refetchUsuarios,
    refetchNotificaciones, refetchMetricas, refetchTopProductos,
    refetchAll,
  }), [
    productos, mesas, clientes, cajas,
    ventasHoy, ventasRecientes, ventasSemana,
    comprobantes, compras, produccionHoy, usuarios, notificaciones,
    metricas, topProductosHoy,
    isLoading, isLoadingComplete,
    refetchProductos, refetchMesas, refetchClientes, refetchCajas,
    refetchVentas, refetchVentasRecientes, refetchComprobantes,
    refetchCompras, refetchProduccion, refetchUsuarios,
    refetchNotificaciones, refetchMetricas, refetchTopProductos,
    refetchAll,
  ]);

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
}