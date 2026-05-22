// context/GlobalDataContext.tsx
// ============================================================
// CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
//
//   ✅ Realtime real: los eventos ahora aplican el diff directo
//      al estado local en vez de hacer refetch completo.
//      - mesas     → INSERT/UPDATE/DELETE directo en estado
//      - ventas    → INSERT agrega al inicio, UPDATE parchea
//      - notifs    → INSERT agrega al inicio (filtrado por usuario)
//      - usuarios  → UPDATE parchea, resto hace refetch
//      - pedidos   → sigue con refetch (es una vista JOIN compleja)
//
//   ✅ usuarioActual eliminado de este contexto: ahora se lee
//      desde AuthContext para evitar query y suscripción duplicados.
//      IMPORTANTE: GlobalDataProvider debe estar dentro de AuthProvider.
//
//   ✅ Carga inicial lazy: setIsLoading(false) después de solo
//      mesas + ventas (lo que el usuario ve primero).
//      El resto carga en segundo plano sin bloquear la UI.
// ============================================================

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
}

const GlobalDataContext = createContext<GlobalDataContextType | null>(null);

export function useGlobalData() {
  const ctx = useContext(GlobalDataContext);
  if (!ctx) throw new Error('useGlobalData debe usarse dentro de <GlobalDataProvider>');
  return ctx;
}

export function GlobalDataProvider({ children }: { children: React.ReactNode }) {
  // ── Estado ────────────────────────────────────────────────────────────────
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
  const [isLoading,         setIsLoading]         = useState(true);
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);

  // ── usuarioActual viene de AuthContext (ya no duplicamos aquí) ────────────
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

  // ── Carga lazy por fases ───────────────────────────────────────────────────
  // Fase 1: solo lo que el usuario ve en los primeros 2 segundos.
  // Fase 2 y 3: sin await, cargan en segundo plano.
  const refetchAll = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingComplete(false);

    // Fase 1 — mesas y ventas desbloquean la UI principal
    await Promise.allSettled([
      refetchMesas(),
      refetchVentas(),
    ]);
    setIsLoading(false); // ← UI usable aquí

    // Fase 2 — sin await, no bloquea el render
    Promise.allSettled([
      refetchProductos(),
      refetchVentasRecientes(),
      refetchClientes(),
      refetchCajas(),
      refetchMetricas(),
    ]).then(() => {
      // Fase 3 — menos urgente
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
    refetchCajas, refetchMetricas, refetchComprobantes,
    refetchCompras, refetchProduccion, refetchUsuarios,
  ]);

  // ── Carga inicial (una sola vez, evita doble en StrictMode) ───────────────
  useEffect(() => {
    if (cargaIniciadaRef.current) return;
    cargaIniciadaRef.current = true;
    const id = setTimeout(() => { refetchAll(); }, 0);
    return () => clearTimeout(id);
  }, [refetchAll]);

  // ── Refs estables para el canal Realtime ──────────────────────────────────
  // Usamos refs para no re-suscribir el canal cuando cambian las funciones
  const refetchMesasRef          = useRef(refetchMesas);
  const refetchNotificacionesRef = useRef(refetchNotificaciones);
  const refetchUsuariosRef       = useRef(refetchUsuarios);

  useEffect(() => { refetchMesasRef.current          = refetchMesas;          }, [refetchMesas]);
  useEffect(() => { refetchNotificacionesRef.current = refetchNotificaciones; }, [refetchNotificaciones]);
  useEffect(() => { refetchUsuariosRef.current       = refetchUsuarios;       }, [refetchUsuarios]);

  // ── Realtime — diff directo al estado, sin refetch salvo excepciones ───────
  useEffect(() => {
    const canal = supabase
      .channel('global-realtime')

      // ── MESAS: diff directo ──────────────────────────────────────────────
      // La tabla mesas solo tiene campos simples (estado, nombre, zona).
      // Podemos aplicar el cambio directo sin ir al servidor.
      // EXCEPCIÓN: si cambia un PEDIDO (que es parte del JOIN en v_mesas_con_pedido),
      // ahí sí necesitamos refetch porque el payload de mesas no incluye pedido_activo.
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
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setMesas(prev => [...prev, payload.new as any]);
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mesas' },
        (payload) => {
          setMesas(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )

      // ── PEDIDOS: refetch de mesas ────────────────────────────────────────
      // El payload de pedidos no incluye los campos de la vista (mozo, minutos_ocupada, etc.)
      // Necesitamos refetch para tener la vista completa actualizada.
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => refetchMesasRef.current()
      )

      // ── VENTAS INSERT: agregar al inicio de las listas ───────────────────
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ventas' },
        (payload) => {
          const nueva = payload.new as Venta;

          // Agregar a ventas de hoy (si es de hoy en Lima)
          const hoyLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
          if (nueva.fecha_local === hoyLima && nueva.estado === 'completada') {
            setVentasHoy(prev => [nueva, ...prev]);
          }

          // Agregar a recientes (máx 10)
          if (nueva.estado === 'completada') {
            setVentasRecientes(prev => [nueva, ...prev.slice(0, 9)]);
          }

          // Actualizar métricas sin hacer query
          if (nueva.estado === 'completada') {
            setMetricas(prev => {
              if (!prev) return prev;
              const nuevoTotal       = prev.ventasHoy + (nueva.total ?? 0);
              const nuevasTransacc   = prev.transacciones + 1;
              return {
                ...prev,
                ventasHoy:      nuevoTotal,
                transacciones:  nuevasTransacc,
                ticketPromedio: nuevasTransacc > 0 ? nuevoTotal / nuevasTransacc : 0,
              };
            });
          }

          // ventas de semana: agregar
          setVentasSemana(prev => [
            ...prev,
            { total: nueva.total ?? 0, fecha_local: nueva.fecha_local },
          ]);
        }
      )

      // ── VENTAS UPDATE: parchear en estado ────────────────────────────────
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
          // Si fue anulada, re-calcular métricas desde el estado actual
          // (más simple y seguro que intentar deshacer el cálculo incremental)
          if (actualizada.estado === 'anulada') {
            setVentasHoy(prev => {
              const ventasActivas = prev.filter(v => v.estado === 'completada');
              const total = ventasActivas.reduce((s, v) => s + (v.total ?? 0), 0);
              setMetricas(m => m ? {
                ...m,
                ventasHoy:     total,
                transacciones: ventasActivas.length,
                ticketPromedio: ventasActivas.length > 0 ? total / ventasActivas.length : 0,
              } : m);
              return prev.map(v => v.id === actualizada.id ? { ...v, ...actualizada } : v);
            });
          }
        }
      )

      // ── NOTIFICACIONES: agregar al inicio ────────────────────────────────
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (payload) => {
          const uid   = usuarioActualRef.current?.id;
          const notif = payload.new as Notificacion;
          // Solo agregar si es para este usuario o es broadcast (usuario_id null)
          if (!notif.usuario_id || notif.usuario_id === uid) {
            setNotificaciones(prev => [notif, ...prev.slice(0, 19)]);
          }
        }
      )

      // ── USUARIOS: diff directo en UPDATE, refetch en resto ───────────────
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'usuarios' },
        (payload) => {
          setUsuarios(prev =>
            prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u)
          );
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'usuarios' },
        () => refetchUsuariosRef.current()
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'usuarios' },
        (payload) => {
          setUsuarios(prev => prev.filter(u => u.id !== payload.old.id));
        }
      )

      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, []); // sin dependencias: el canal se crea una sola vez

  // ── Valor del contexto ────────────────────────────────────────────────────
  const value = useMemo<GlobalDataContextType>(() => ({
    productos, mesas, clientes, cajas,
    ventasHoy, ventasRecientes, ventasSemana,
    comprobantes, compras, produccionHoy, usuarios, notificaciones, metricas,
    isLoading, isLoadingComplete,
    refetchProductos, refetchMesas, refetchClientes, refetchCajas,
    refetchVentas, refetchVentasRecientes, refetchComprobantes,
    refetchCompras, refetchProduccion, refetchUsuarios,
    refetchNotificaciones, refetchMetricas, refetchAll,
  }), [
    productos, mesas, clientes, cajas,
    ventasHoy, ventasRecientes, ventasSemana,
    comprobantes, compras, produccionHoy, usuarios, notificaciones, metricas,
    isLoading, isLoadingComplete,
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