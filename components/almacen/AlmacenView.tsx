// components/almacen/AlmacenView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, AlertTriangle, ArrowUpDown, Loader2, Plus,
  FileSpreadsheet, Download,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn, Card, Paginacion } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { CATEGORIAS_INSUMO, ordenarCategorias } from '@/constants/productos/productosConstants';
import { exportarAlmacenExcel } from '@/utils/almacen/exportarAlmacenExcel';
import { exportarAlmacenPdf } from '@/utils/almacen/exportarAlmacenPdf';
import { LOGO_MADRE_BASE64 } from '@/constants/logo/logoMadre';
import type { Producto } from '@/lib/supabase/types';

import TablaProductos from '@/components/almacen/TablaProductos';
import ModalProducto from '@/components/almacen/modals/ModalProducto';
import ModalAjustarInsumo from '@/components/almacen/modals/ModalAjustarInsumo';

// ════════════════════════════════════════════════════════════════════════════
// VISTA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export function AlmacenView() {
  const { productos, isLoading, refetchProductos } = useGlobalData();
  const [busqueda,   setBusqueda]  = useState('');
  const [catFiltro,  setCatFiltro] = useState('Todos');
  const [modalAjuste,setModalAjuste]=useState<Producto | null>(null);
  const [modalProd,  setModalProd] = useState<{ open: boolean; producto: Producto | null }>({ open: false, producto: null });
  const [pagina,     setPagina]    = useState(1);
  const [exportando,       setExportando]       = useState(false);
  const [exportandoExcel,  setExportandoExcel]  = useState(false);
  const POR_PAGINA = 20;

  const insumosBase = useMemo(
    () => productos.filter(p => p.activo && p.tipo === 'insumo'),
    [productos],
  );

  const categorias = useMemo(() => {
    const cats = ordenarCategorias([...new Set(insumosBase.map(p => p.categoria))], CATEGORIAS_INSUMO);
    return ['Todos', ...cats];
  }, [insumosBase]);

  const insumos = useMemo(() => {
    const q = busqueda.toLowerCase();
    return insumosBase
      .filter(p => catFiltro === 'Todos' || p.categoria === catFiltro)
      .filter(p => !q || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [insumosBase, busqueda, catFiltro]);

  const [prevFiltroKey, setPrevFiltroKey] = useState(`${busqueda}|${catFiltro}`);
  const filtroKey = `${busqueda}|${catFiltro}`;
  if (filtroKey !== prevFiltroKey) { setPrevFiltroKey(filtroKey); setPagina(1); }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  const totalPaginas = Math.max(1, Math.ceil(insumos.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles      = insumos.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  // Valor en almacén: se calcula 100% con `precio` (antes usaba
  // `p.costo ?? p.precio`, pero como `costo` casi siempre llegaba en 0
  // desde la BD, el "??" nunca entraba en juego y el total salía en 0).
  const valorTotal  = insumosBase.reduce((a, p) => a + p.stock_cocina * p.precio, 0);
  const bajosAlerta = insumosBase.filter(p => p.stock_cocina < p.stock_minimo_cocina);

  // Exporta siempre el inventario completo de insumos (no solo la página
  // o el filtro visible), igual que el criterio usado en Reportes.
  const handleExportarExcel = () => {
    setExportandoExcel(true);
    try {
      exportarAlmacenExcel(insumosBase);
    } catch (e) {
      console.error('Error exportando Excel:', e);
      alert('Ocurrió un error al generar el Excel. Revisa la consola.');
    } finally {
      setExportandoExcel(false);
    }
  };

  const handleExportarPdf = () => {
    setExportando(true);
    try {
      exportarAlmacenPdf({ insumos: insumosBase, logoBase64: LOGO_MADRE_BASE64 });
    } catch (e) {
      console.error('Error exportando PDF:', e);
      alert('Ocurrió un error al generar el PDF. Revisa la consola.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Almacén"
        subtitle="Insumos y materia prima"
        action={
          <div className="flex items-center gap-2">
            <Btn color={B.green} textColor={B.cream} onClick={handleExportarExcel} disabled={exportandoExcel}>
              {exportandoExcel
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <FileSpreadsheet className="w-4 h-4" />}
              {exportandoExcel ? 'Generando...' : 'Excel'}
            </Btn>
            <Btn color={B.terra} textColor={B.cream} onClick={handleExportarPdf} disabled={exportando}>
              {exportando
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              {exportando ? 'Generando...' : 'PDF'}
            </Btn>
            <Btn onClick={() => setModalProd({ open: true, producto: null })}>
              <Plus className="w-4 h-4" />Nuevo Insumo
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Insumos',    value: insumosBase.length,            unit: 'insumos',    color: B.charcoal },
          { label: 'Stock Bajo',       value: bajosAlerta.length,            unit: 'por reponer',color: B.terra    },
          { label: 'Valor en Almacén', value: `S/ ${Math.round(valorTotal)}`,unit: 'estimado',   color: B.terra    },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-widest" style={{ color: B.muted }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: B.muted }}>{s.unit}</p>
          </Card>
        ))}
      </div>

      {/* Alerta stock bajo */}
      {bajosAlerta.length > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3 mb-4"
          style={{ background: '#fef0e6', border: `1px solid ${B.terra}30` }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: B.terra }} />
          <div>
            <p className="text-sm font-bold" style={{ color: B.terra }}>
              {bajosAlerta.length} insumo{bajosAlerta.length > 1 ? 's' : ''} bajo el mínimo
            </p>
            <p className="text-xs mt-0.5" style={{ color: B.terra }}>{bajosAlerta.map(p => p.nombre).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Filtros unificados en una sola tarjeta */}
      <div className="flex gap-2 mb-4">
        {/* Buscador */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar insumo / materia prima..."
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }} />
        </div>
        {/* Dropdown categorías */}
        <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
          className="py-3 px-3 rounded-xl text-sm font-semibold outline-none cursor-pointer shrink-0"
          style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal, minWidth: 140 }}>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <TablaProductos
          items={visibles}
          stockKey="stock_cocina"
          minimoKey="stock_minimo_cocina"
          color={B.terra}
          onAjustar={p => setModalAjuste(p)}
          onEditar={p => setModalProd({ open: true, producto: p })}
          accionLabel="Ajustar"
          AccionIcon={ArrowUpDown}
        />
        <Paginacion page={paginaSegura} totalPages={totalPaginas} onChange={setPagina}
          totalItems={insumos.length} pageSize={POR_PAGINA} />
      </div>

      {/* Modales */}
      {modalAjuste && (
        <ModalAjustarInsumo
          producto={modalAjuste}
          onClose={() => setModalAjuste(null)}
          onSaved={() => { setModalAjuste(null); refetchProductos(); }}
        />
      )}

      {modalProd.open && (
        <ModalProducto
          producto={modalProd.producto}
          onClose={() => setModalProd({ open: false, producto: null })}
          onSaved={() => { setModalProd({ open: false, producto: null }); refetchProductos(); }}
        />
      )}
    </div>
  );
}