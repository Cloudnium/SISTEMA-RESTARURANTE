'use client';

// context/GlobalDataContext.tsx
// Contexto global que carga todos los datos de Supabase una sola vez
// y los expone a toda la app sin prop drilling.

import React, {
  createContext, useContext, useEffect, useState,
  useCallback, useMemo, useRef,
} from 'react';
import {
  getProductos, getMesas, getClientes, getCajas,
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

  const cargaIniciadaRef  = useRef(false);
  // ⚠️ Este ref se actualiza SOLO dentro de un useEffect (nunca durante render)
  const usuarioActualRef  = useRef<Usuario | null>(null);

  // Sincronizar ref con el estado (en effect, no en render)
  useEffect(() => {
    usuarioActualRef.current = usuarioActual;
  }, [usuarioActual]);

  // ── Fetches individuales ───────────────────────────────────────────────────
  const refetchProductos = useCallback(async () => {
    try { setProductos(await getProductos()); }
    catch (e) { console.error('productos:', e); }
  }, []);

  const refetchMesas = useCallback(async () => {
    try { setMesas(await getMesas()); }
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

  // Sin dependencias: accede al uid desde el ref en tiempo de ejecución
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

    await Promise.allSettled([
      refetchProductos(),
      refetchMesas(),
      refetchVentas(),
      refetchVentasRecientes(),
    ]);

    setIsLoading(false);

    await Promise.allSettled([
      refetchClientes(),
      refetchCajas(),
      refetchComprobantes(),
      refetchMetricas(),
    ]);

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
        if (session?.user) {
          await cargarPerfil(session.user.id);
        } else {
          setUsuarioActual(null);
        }
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
  useEffect(() => {
    const canal = supabase
      .channel('global-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' },
        () => { refetchMesas(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' },
        () => { refetchVentas(); refetchVentasRecientes(); refetchMetricas(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones' },
        () => { refetchNotificaciones(); })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [refetchMesas, refetchVentas, refetchVentasRecientes, refetchMetricas, refetchNotificaciones]);

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