// context/GlobalDataContext.tsx
'use client';

import React, {
  createContext, useContext, useEffect, useState,
  useCallback, useMemo, useRef,
} from 'react';
import {
  getProductos, getMesasConPedido, getClientes, getCajas,
  getVentasHoy, getVentasRecientes, getVentasSemana,
  getComprobantes, getCompras, getUsuarios,
  getProduccionHoy, getNotificacionesSinLeer,
  getMetricasDashboard, type MetricasDashboard,
} from '@/lib/supabase/queries';
import type {
  Producto, Mesa, Cliente, Caja, Venta,
  Compra, ProduccionCocina, Usuario, Notificacion,
} from '@/lib/supabase/types';
import { supabase } from '@/lib/supabase/client';

type ComprobanteDetalle = Awaited<ReturnType<typeof getComprobantes>>[number];

interface GlobalDataContextType {
  productos:          Producto[];
  mesas:              Mesa[];
  clientes:           Cliente[];
  cajas:              Caja[];
  ventasHoy:          Venta[];
  ventasRecientes:    Venta[];
  ventasSemana:       Array<{ total: number; fecha_local: string }>;
  comprobantes:       ComprobanteDetalle[];
  compras:            Compra[];
  produccionHoy:      ProduccionCocina[];
  usuarios:           Usuario[];
  notificaciones:     Notificacion[];
  metricas:           MetricasDashboard | null;
  isLoading:          boolean;
  isLoadingComplete:  boolean;
  refetchProductos:       () => Promise<void>;
  refetchMesas:           () => Promise<void>;
  refetchClientes:        () => Promise<void>;
  refetchCajas:           () => Promise<void>;
  refetchVentas:          () => Promise<void>;
  refetchVentasRecientes: () => Promise<void>;
  refetchComprobantes:    () => Promise<void>;
  refetchCompras:         () => Promise<void>;
  refetchProduccion:      () => Promise<void>;
  refetchUsuarios:        () => Promise<void>;
  refetchNotificaciones:  () => Promise<void>;
  refetchMetricas:        () => Promise<void>;
  refetchAll:             () => Promise<void>;
  usuarioActual:      Usuario | null;
}

const GlobalDataContext = createContext<GlobalDataContextType | null>(null);

export function useGlobalData() {
  const ctx = useContext(GlobalDataContext);
  if (!ctx) throw new Error('useGlobalData debe usarse dentro de <GlobalDataProvider>');
  return ctx;
}

export function GlobalDataProvider({ children }: { children: React.ReactNode }) {
  const [productos,       setProductos]       = useState<Producto[]>([]);
  const [mesas,           setMesas]           = useState<Mesa[]>([]);
  const [clientes,        setClientes]        = useState<Cliente[]>([]);
  const [cajas,           setCajas]           = useState<Caja[]>([]);
  const [ventasHoy,       setVentasHoy]       = useState<Venta[]>([]);
  const [ventasRecientes, setVentasRecientes] = useState<Venta[]>([]);
  const [ventasSemana,    setVentasSemana]    = useState<Array<{ total: number; fecha_local: string }>>([]);
  const [comprobantes,    setComprobantes]    = useState<ComprobanteDetalle[]>([]);
  const [compras,         setCompras]         = useState<Compra[]>([]);
  const [produccionHoy,   setProduccionHoy]   = useState<ProduccionCocina[]>([]);
  const [usuarios,        setUsuarios]        = useState<Usuario[]>([]);
  const [notificaciones,  setNotificaciones]  = useState<Notificacion[]>([]);
  const [metricas,        setMetricas]        = useState<MetricasDashboard | null>(null);
  const [usuarioActual,   setUsuarioActual]   = useState<Usuario | null>(null);
  const [isLoading,         setIsLoading]         = useState(true);
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);

  const cargaIniciadaRef = useRef(false);
  const usuarioActualRef = useRef<Usuario | null>(null);

  useEffect(() => {
    usuarioActualRef.current = usuarioActual;
  }, [usuarioActual]);

  // ── Fetches individuales ───────────────────────────────────────────────────
  const refetchProductos = useCallback(async () => {
    try { setProductos(await getProductos()); }
    catch (e) { console.error('productos:', e); }
  }, []);

  const refetchMesas = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMesas((await getMesasConPedido()) as any[]);
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

  // ── Carga por fases ────────────────────────────────────────────────────────
  const refetchAll = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingComplete(false);

    // Fase 1: datos críticos para mostrar la UI principal
    await Promise.allSettled([
      refetchProductos(),
      refetchMesas(),
      refetchVentas(),
      refetchVentasRecientes(),
    ]);

    setIsLoading(false);

    // Fase 2: datos secundarios
    await Promise.allSettled([
      refetchClientes(),
      refetchCajas(),
      refetchComprobantes(),
      refetchMetricas(),
    ]);

    // Fase 3: datos menos urgentes
    await Promise.allSettled([
      refetchCompras(),
      refetchProduccion(),
      refetchUsuarios(),
    ]);

    setIsLoadingComplete(true);
  }, [
    refetchProductos, refetchMesas, refetchVentas, refetchVentasRecientes,
    refetchClientes, refetchCajas, refetchComprobantes, refetchMetricas,
    refetchCompras, refetchProduccion, refetchUsuarios,
  ]);

  // ── Usuario autenticado ────────────────────────────────────────────────────
  useEffect(() => {
    const cargarPerfil = async (userId: string) => {
      const { data } = await supabase
        .from('usuarios')
        .select('*, caja:cajas(nombre)')
        .eq('id', userId)
        .single();
      setUsuarioActual(data as Usuario | null);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) cargarPerfil(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) await cargarPerfil(session.user.id);
        else setUsuarioActual(null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Carga inicial (una sola vez, evita doble en StrictMode) ───────────────
  useEffect(() => {
    if (cargaIniciadaRef.current) return;
    cargaIniciadaRef.current = true;
    const id = setTimeout(() => { refetchAll(); }, 0);
    return () => clearTimeout(id);
  }, [refetchAll]);

  // ── Realtime ───────────────────────────────────────────────────────────────
  // Usamos refs para las funciones de refetch para evitar re-suscribirse
  // cada vez que cambia alguna dependencia del useCallback.
  const refetchMesasRef         = useRef(refetchMesas);
  const refetchVentasRef        = useRef(refetchVentas);
  const refetchVentasRecRef     = useRef(refetchVentasRecientes);
  const refetchMetricasRef      = useRef(refetchMetricas);
  const refetchNotificacionesRef = useRef(refetchNotificaciones);
  const refetchUsuariosRef      = useRef(refetchUsuarios);

  useEffect(() => { refetchMesasRef.current          = refetchMesas;          }, [refetchMesas]);
  useEffect(() => { refetchVentasRef.current         = refetchVentas;         }, [refetchVentas]);
  useEffect(() => { refetchVentasRecRef.current      = refetchVentasRecientes; }, [refetchVentasRecientes]);
  useEffect(() => { refetchMetricasRef.current       = refetchMetricas;       }, [refetchMetricas]);
  useEffect(() => { refetchNotificacionesRef.current = refetchNotificaciones;  }, [refetchNotificaciones]);
  useEffect(() => { refetchUsuariosRef.current       = refetchUsuarios;       }, [refetchUsuarios]);

  useEffect(() => {
    const canal = supabase
      .channel('global-realtime')
      // Mesas: se actualizan cuando cambia la mesa O el pedido activo
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' },
        () => refetchMesasRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' },
        () => refetchMesasRef.current())
      // Ventas y métricas del dashboard
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' },
        () => {
          refetchVentasRef.current();
          refetchVentasRecRef.current();
          refetchMetricasRef.current();
        })
      // Usuarios: actualizar tabla cuando se crea/modifica un usuario
      // (el INSERT lo hace la API Route con service_role, Realtime igual lo detecta)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' },
        () => refetchUsuariosRef.current())
      // Notificaciones
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones' },
        () => refetchNotificacionesRef.current())
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  // Solo corre una vez — los refs mantienen las funciones actualizadas
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<GlobalDataContextType>(() => ({
    productos, mesas, clientes, cajas,
    ventasHoy, ventasRecientes, ventasSemana,
    comprobantes, compras, produccionHoy, usuarios, notificaciones, metricas,
    isLoading, isLoadingComplete,
    usuarioActual,
    refetchProductos, refetchMesas, refetchClientes, refetchCajas,
    refetchVentas, refetchVentasRecientes, refetchComprobantes,
    refetchCompras, refetchProduccion, refetchUsuarios,
    refetchNotificaciones, refetchMetricas, refetchAll,
  }), [
    productos, mesas, clientes, cajas,
    ventasHoy, ventasRecientes, ventasSemana,
    comprobantes, compras, produccionHoy, usuarios, notificaciones, metricas,
    isLoading, isLoadingComplete, usuarioActual,
    refetchProductos, refetchMesas, refetchClientes, refetchCajas,
    refetchVentas, refetchVentasRecientes, refetchComprobantes,
    refetchCompras, refetchProduccion, refetchUsuarios,
    refetchNotificaciones, refetchMetricas, refetchAll,
  ]);

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
}
