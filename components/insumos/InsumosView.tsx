// components/insumos/InsumosView.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Loader2, Minus, Plus, Search } from 'lucide-react';
import { B } from '@/lib/brand';
import { Btn, Card, Paginacion, PageHeader, ProgressBar } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { supabase } from '@/lib/supabase/client';
import { ordenarCategorias } from '@/constants/productos/productosConstants';
import { POR_PAGINA_PRODUCTOS } from '@/constants/insumos/insumosConstants';
import type { Producto } from '@/lib/supabase/types';

import ModalInsumo from '@/components/insumos/ModalInsumo';
import ModalConsumo from '@/components/insumos/modals/ModalConsumo';
import ModalHistorial from '@/components/insumos/modals/ModalHistorial';

export default function InsumosView() {
  const { productos, isLoading, refetchProductos } = useGlobalData();
  const [busqueda,      setBusqueda]      = useState('');
  const [catFiltro,     setCatFiltro]     = useState('Todos');
  const [pagina,        setPagina]        = useState(1);
  const [modal,         setModal]         = useState<{ open: boolean; insumo: Producto | null }>({ open: false, insumo: null });
  const [modalConsumo,  setModalConsumo]  = useState<Producto | null>(null);
  const [modalHistorial,setModalHistorial]= useState(false);

  const insumos = useMemo(() => productos.filter(p => p.tipo === 'producto_venta' && p.activo), [productos]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel('insumos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => refetchProductos())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetchProductos]);

  const categorias = useMemo(() => {
    const cats = ordenarCategorias([...new Set(insumos.map(i => i.categoria))]);
    return ['Todos', ...cats];
  }, [insumos]);

  const bajos = insumos.filter(i => i.stock_tienda < i.stock_minimo_tienda);
  const agotados = insumos.filter(i => i.stock_tienda <= 0);

  const filtrados = useMemo(() => insumos.filter(i => {
    const matchQ = i.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchC = catFiltro === 'Todos' || i.categoria === catFiltro;
    return matchQ && matchC;
  }), [insumos, busqueda, catFiltro]);

  const [prevFiltroKey, setPrevFiltroKey] = useState(`${busqueda}|${catFiltro}`);
  const filtroKey = `${busqueda}|${catFiltro}`;
  if (filtroKey !== prevFiltroKey) { setPrevFiltroKey(filtroKey); setPagina(1); }

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA_PRODUCTOS));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaSegura - 1) * POR_PAGINA_PRODUCTOS, paginaSegura * POR_PAGINA_PRODUCTOS);

  const valorTotal = insumos.reduce((a, i) => a + i.stock_tienda * i.precio, 0);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Productos" subtitle="Productos que se venden en el punto de venta"
        action={
          <div className="flex gap-2">
            <button onClick={() => setModalHistorial(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: B.terra, color: B.cream }}>
              <BarChart3 className="w-4 h-4" />Historial
            </button>
            <Btn onClick={() => setModal({ open: true, insumo: null })}><Plus className="w-4 h-4" />Nuevo Producto</Btn>
          </div>
        } />

      {bajos.length > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3 mb-5"
          style={{ background: '#fef0e6', border: `1px solid ${B.terra}30` }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: B.terra }} />
          <div>
            <p className="text-sm font-bold" style={{ color: B.terra }}>{bajos.length} productos bajo el mínimo</p>
            <p className="text-xs mt-0.5" style={{ color: B.terra }}>{bajos.map(i => i.nombre).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Productos',value: insumos.length,              unit: 'productos',    color: B.charcoal },
          { label: 'Stock Agotado',  value: agotados.length,             unit: 'sin stock',    color: B.terra    },
          { label: 'Stock Bajo',     value: bajos.length,                unit: 'por reponer',  color: B.gold     },
          { label: 'Valor en Tienda',value: `S/ ${Math.round(valorTotal)}`,unit: 'estimado',  color: B.green    },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-widest" style={{ color: B.muted }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: B.muted }}>{s.unit}</p>
          </Card>
        ))}
      </div>

      {/* Filtros unificados en una sola tarjeta */}
      <div className="flex gap-2 mb-4">
        {/* Buscador */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar producto..."
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
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Producto', 'Categoría', 'Stock tienda / Mín.', 'Precio unit.', 'Acción'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
                  style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map(ins => {
              const low = ins.stock_tienda < ins.stock_minimo_tienda;
              const pct = Math.min((ins.stock_tienda / Math.max(ins.stock_minimo_tienda * 3, 1)) * 100, 100);
              return (
                <tr key={ins.id} style={{ borderTop: `1px solid ${B.cream}` }}
                  onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {low && <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: B.terra }} />}
                      <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{ins.nombre}</p>
                    </div>
                    <p className="text-xs ml-5" style={{ color: B.muted }}>{ins.unidad_medida}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: B.cream, color: B.charcoal }}>{ins.categoria}</span>
                  </td>
                  <td className="px-4 py-3 w-44">
                    <div className="flex items-center gap-2 mb-1">
                      <ProgressBar pct={pct} color={low ? B.terra : B.green} height={5} />
                      <span className="text-xs font-bold shrink-0" style={{ color: low ? B.terra : B.charcoal }}>{ins.stock_tienda}</span>
                    </div>
                    <p className="text-[10px]" style={{ color: B.muted }}>Mín: {ins.stock_minimo_tienda}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: B.charcoal }}>S/ {ins.precio.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {/* Botón Ajustar Stock */}
                      <button onClick={() => setModalConsumo(ins)}
                        className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: B.terra, color: B.cream }}>
                        <Minus className="w-3 h-3" /> Ajustar
                      </button>
                      <button onClick={() => setModal({ open: true, insumo: ins })}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: B.green, color: B.cream }}>
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: B.muted }}>
            {insumos.length === 0 ? 'Sin productos registrados aún' : 'No hay resultados'}
          </div>
        )}
        <Paginacion page={paginaSegura} totalPages={totalPaginas} onChange={setPagina}
          totalItems={filtrados.length} pageSize={POR_PAGINA_PRODUCTOS} />
      </div>

      {/* Modales */}
      {modal.open && (
        <ModalInsumo insumo={modal.insumo}
          onClose={() => setModal({ open: false, insumo: null })}
          onSaved={() => { setModal({ open: false, insumo: null }); refetchProductos(); }} />
      )}

      {modalConsumo && (
        <ModalConsumo insumo={modalConsumo}
          onClose={() => setModalConsumo(null)}
          onSaved={() => { setModalConsumo(null); refetchProductos(); }} />
      )}

      {modalHistorial && (
          <ModalHistorial onClose={() => setModalHistorial(false)} />
      )}
    </div>
  );
}