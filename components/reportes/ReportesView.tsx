// components/reportes/ReportesView.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { exportarReportePdf } from '@/utils/reportes/exportarReportePdf';
import {
  getReporteResumenPeriodo,
  getReporteVentasPorMetodoPago,
  getReporteVentasPorComprobante,
  getReporteTopProductos,
  getReporteTopCategorias,
  getReporteTopUsuarios,
  getReporteTopClientes,
  getReporteDetalleVentas,
  getReporteVentasSemanales,
  getRangoSemanaActual,
  getReporteDetalleVentasCompleto, //nuevos
  getReporteProductosAgotados, //nuevos
  getReporteProductosStockBajo, //nuevos
  type ReporteResumenPeriodo,
  type ReporteVentasPorMetodoPago,
  type ReporteVentasPorComprobante,
  type ReporteTopProductos,
  type ReporteTopCategorias,
  type ReporteTopUsuarios,
  type ReporteTopClientes,
  type DetalleVenta,
  type ReporteVentasSemanal,
} from '@/lib/supabase/queries/reportes';

import { ReportesFiltros }             from './ReportesFiltros';
import { ReportesKpis }                from './ReportesKpis';
import { ReportesAlertas }             from './ReportesAlertas';
import { ReportesTopCajas, ReportesVentasSemanales } from './ReportesTopCajasYSemana';
import { ReportesTopProductos, ReportesTopCategorias } from './ReportesTopProductosYCategorias';
import {
  ReportesMejoresClientes,
  ReportesMetodosPago,
  ReportesVentasPorComprobante,
  ReportesResumenPeriodo,
} from './ReportesClientesYPagos';
import { ReportesDetalleVentas }       from './ReportesDetalleVentas';
import { LOGO_MADRE_BASE64 } from '@/constants/logo/logoMadre';

const DETALLE_LIMITE = 20;

interface DatosReporte {
  resumen:       ReporteResumenPeriodo | null;
  metodosPago:   ReporteVentasPorMetodoPago[];
  comprobantes:  ReporteVentasPorComprobante[];
  topProductos:  ReporteTopProductos[];
  topCategorias: ReporteTopCategorias[];
  topUsuarios:   ReporteTopUsuarios[];
  topClientes:   ReporteTopClientes[];
  detalleVentas: DetalleVenta[];
  semanas:       ReporteVentasSemanal[];
}

// ─── Función async pura fuera de React ───────────────────────────────────────
async function cargarDatosReporte(
  desde: string,
  hasta: string,
  signal: AbortSignal,
): Promise<DatosReporte | null> {
  const [
    resumen, metodosPago, comprobantes, topProductos,
    topCategorias, topUsuarios, topClientes, detalleVentas, semanas,
  ] = await Promise.allSettled([
    getReporteResumenPeriodo(desde, hasta),
    getReporteVentasPorMetodoPago(desde, hasta),
    getReporteVentasPorComprobante(desde, hasta),
    getReporteTopProductos(desde, hasta, 5),
    getReporteTopCategorias(desde, hasta),
    getReporteTopUsuarios(desde, hasta),
    getReporteTopClientes(desde, hasta, 5),
    getReporteDetalleVentas(desde, hasta, DETALLE_LIMITE),
    getReporteVentasSemanales(desde, hasta),
  ]);

  if (signal.aborted) return null;

  return {
    resumen:       resumen.status       === 'fulfilled' ? resumen.value       : null,
    metodosPago:   metodosPago.status   === 'fulfilled' ? metodosPago.value   : [],
    comprobantes:  comprobantes.status  === 'fulfilled' ? comprobantes.value  : [],
    topProductos:  topProductos.status  === 'fulfilled' ? topProductos.value  : [],
    topCategorias: topCategorias.status === 'fulfilled' ? topCategorias.value : [],
    topUsuarios:   topUsuarios.status   === 'fulfilled' ? topUsuarios.value   : [],
    topClientes:   topClientes.status   === 'fulfilled' ? topClientes.value   : [],
    detalleVentas: detalleVentas.status === 'fulfilled' ? detalleVentas.value : [],
    semanas:       semanas.status       === 'fulfilled' ? semanas.value       : [],
  };
}

// ─── Estado del hook: clave = "desde|hasta" que identifica qué datos tenemos ─
interface EstadoReporte {
  datos:    DatosReporte | null; // null = nunca cargó
  claveActual: string;           // clave de los datos en pantalla
}

function useReporteDatos(desde: string, hasta: string, habilitado: boolean) {
  const claveDeseada = `${desde}|${hasta}`;

  const [estado, setEstado] = useState<EstadoReporte>({
    datos:       null,
    claveActual: '',
  });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!habilitado) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // ✅ CERO setState en el body del effect.
    // Solo iniciamos la Promise — todo setState ocurre en .then()
    cargarDatosReporte(desde, hasta, controller.signal).then((resultado) => {
      if (resultado === null) return;
      setEstado({ datos: resultado, claveActual: `${desde}|${hasta}` });
    });

    return () => { controller.abort(); };
  }, [desde, hasta, habilitado]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // actualizando = tenemos datos PERO son de un rango distinto al pedido
  const actualizando = estado.datos !== null && estado.claveActual !== claveDeseada;

  return {
    datos:       estado.datos,
    actualizando,
  };
}

// ─── Vista principal ──────────────────────────────────────────────────────────
export default function ReportesView() {
  const { isLoading: globalLoading } = useGlobalData();

  const rangoInicial = useMemo(() => getRangoSemanaActual(), []);
  const [desde, setDesde] = useState(rangoInicial.inicio);
  const [hasta, setHasta] = useState(rangoInicial.fin);

  const { datos, actualizando } = useReporteDatos(desde, hasta, !globalLoading);

  const [exportando, setExportando] = useState(false);

  // datos === null → nunca ha cargado → spinner pantalla completa
  if (globalLoading || datos === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
      </div>
    );
  }

    const handleExportarPdf = async () => {
    if (!datos) return;
    setExportando(true);
    try {
      const [detalleCompleto, agotados, stockBajo] = await Promise.all([
        getReporteDetalleVentasCompleto(desde, hasta, 100),
        getReporteProductosAgotados(),
        getReporteProductosStockBajo(),
      ]);

      exportarReportePdf({
        desde, hasta,
        resumen:       datos.resumen,
        metodosPago:   datos.metodosPago,
        comprobantes:  datos.comprobantes,
        topProductos:  datos.topProductos,
        topCategorias: datos.topCategorias,
        topUsuarios:   datos.topUsuarios,
        detalleVentas: detalleCompleto,
        agotados,
        stockBajo,
        logoBase64:    LOGO_MADRE_BASE64,
      });
    } catch (e) {
      console.error('Error exportando PDF:', e);
      alert('Ocurrió un error al generar el PDF. Revisa la consola.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="relative">

      {/* Pill "Actualizando" al cambiar filtros — no borra el contenido */}
      {actualizando && (
        <div
          className="absolute inset-0 z-10 flex items-start justify-end pointer-events-none"
          style={{ paddingTop: '1rem', paddingRight: '1.5rem' }}
        >
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium shadow-md"
            style={{ background: B.green, color: B.cream }}
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Actualizando…
          </div>
        </div>
      )}

      <div
        style={{
          opacity:       actualizando ? 0.5 : 1,
          transition:    'opacity 0.2s ease',
          pointerEvents: actualizando ? 'none' : 'auto',
        }}
      >
        <PageHeader
          title="Reportes y Análisis"
          subtitle="Sistema completo de reportes de ventas e inventario"
          action={
            <Btn color={B.terra} textColor={B.cream} onClick={handleExportarPdf} disabled={exportando}>
              {exportando
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              {exportando ? 'Generando...' : 'PDF'}
            </Btn>
          }
        />

        <ReportesFiltros
          desde={desde}
          hasta={hasta}
          onDesde={setDesde}
          onHasta={setHasta}
        />

        <ReportesKpis resumen={datos.resumen} />

        <ReportesAlertas resumen={datos.resumen} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ReportesTopCajas    usuarios={datos.topUsuarios} />
          <ReportesVentasSemanales semanas={datos.semanas} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ReportesTopProductos  productos={datos.topProductos} />
          <ReportesTopCategorias categorias={datos.topCategorias} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ReportesMejoresClientes clientes={datos.topClientes} />
          <ReportesMetodosPago     metodos={datos.metodosPago} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ReportesVentasPorComprobante comprobantes={datos.comprobantes} />
          <ReportesResumenPeriodo       resumen={datos.resumen} />
        </div>

        <ReportesDetalleVentas
          ventas={datos.detalleVentas}
          limite={DETALLE_LIMITE}
        />
      </div>
    </div>
  );
}