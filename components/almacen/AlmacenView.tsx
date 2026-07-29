// componentes/almacen/AlmacenView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, X, Package, AlertTriangle, ArrowUpDown, Loader2, Plus,
  TrendingDown, TrendingUp, FileSpreadsheet, Download,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn, Card, ProgressBar, Paginacion } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { crearProducto, actualizarProducto, ajustarStockInsumo } from '@/lib/supabase/queries';
import { CATEGORIAS_INSUMO, CATEGORIA_OTRA, ordenarCategorias } from '@/constants/productos/productosConstants';
import { exportarAlmacenExcel } from '@/utils/almacen/exportarAlmacenExcel';
import { exportarAlmacenPdf } from '@/utils/almacen/exportarAlmacenPdf';
import { LOGO_MADRE_BASE64 } from '@/constants/logo/logoMadre';
import type { Producto } from '@/lib/supabase/types';

// ─── helpers ──────────────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
};
function inputCls(extra = '') {
  return `w-full px-3 py-2.5 rounded-xl text-sm outline-none ${extra}`;
}

// ─── Modal base ───────────────────────────────────────────────────────────────
function ModalBase({ title, subtitle, onClose, children, actions }: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: B.cream }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>{title}</h2>
            {subtitle && <p className="text-xs" style={{ color: B.muted }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {actions && <div className="px-6 pb-6 flex gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// ─── Modal crear / editar insumo ──────────────────────────────────────────────
// Nota: se eliminó el campo "costo unitario" del formulario. La métrica de
// valorización de almacén (y cualquier cálculo de costo) ahora usa `precio`
// como fuente única de verdad. Internamente seguimos escribiendo `costo`
// igual a `precio` al guardar, para no romper la columna en la BD ni a
// otras partes del sistema que puedan leer `producto.costo`.
interface ProductoForm {
  nombre: string; categoria: string; precio: string;
  unidad_medida: string; stock_minimo_cocina: string; stock_cocina: string;
}
const PROD_VACIO: ProductoForm = {
  nombre: '', categoria: '', precio: '0',
  unidad_medida: 'unidades', stock_minimo_cocina: '0', stock_cocina: '0',
};

function ModalProducto({ producto, onClose, onSaved }: {
  producto: Producto | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductoForm>(producto ? {
    nombre:               producto.nombre,
    categoria:            producto.categoria,
    precio:               String(producto.precio),
    unidad_medida:        producto.unidad_medida,
    stock_minimo_cocina:  String(producto.stock_minimo_cocina),
    stock_cocina:         String(producto.stock_cocina ?? 0),
  } : PROD_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  // La categoría es texto libre en la BD, pero en el formulario se elige de
  // una lista predefinida. Si el insumo (editar) trae una categoría que no
  // está en la lista (dato legado), arrancamos en modo "otra" para no perderla.
  const [modoCategoria, setModoCategoria] = useState<'lista' | 'otra'>(
    producto && producto.categoria && !CATEGORIAS_INSUMO.includes(producto.categoria) ? 'otra' : 'lista',
  );

  const set = (key: keyof ProductoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre.trim())    { setError('El nombre es obligatorio'); return; }
    if (!form.categoria.trim()) { setError('La categoría es obligatoria'); return; }
    setGuardando(true); setError('');
    try {
      const precioNum = parseFloat(form.precio) || 0;
      const base = {
        nombre:               form.nombre.trim(),
        categoria:            form.categoria.trim(),
        tipo:                 'insumo' as const,
        precio:               precioNum,
        // Se mantiene sincronizado con `precio` para no romper el esquema
        // ni otras vistas que aún lean `costo` directamente de la BD.
        costo:                precioNum,
        unidad_medida:        form.unidad_medida || 'unidades',
        stock_cocina:         parseFloat(form.stock_cocina) || 0,
        stock_minimo_cocina:  parseFloat(form.stock_minimo_cocina) || 0,
        activo:               true,
      };
      if (producto) {
        await actualizarProducto(producto.id, base);
      } else {
        await crearProducto({
          ...base, stock_tienda: 0, stock_minimo_tienda: 0, stock_general: 0,
        } as Parameters<typeof crearProducto>[0]);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const UNIDADES = ['unidades', 'porciones', 'kg', 'litros', 'bolsas', 'cajas'];

  return (
    <ModalBase
      title={producto ? 'Editar Insumo' : 'Nuevo Insumo'}
      subtitle={producto ? undefined : 'Arroz, harina, huevo, gelatina en polvo, etc.'}
      onClose={onClose}
      actions={<>
        <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal }} onClick={onClose}>Cancelar</button>
        <button onClick={handleGuardar} disabled={guardando}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: B.green, color: B.cream }}>
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          {producto ? 'Guardar cambios' : 'Crear insumo'}
        </button>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Nombre del insumo</label>
          <input type="text" value={form.nombre} onChange={set('nombre')}
            placeholder="Ej: Huevo, Gelatina en polvo 100g..." className={inputCls()} style={INP} />
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Categoría</label>
          <select
            value={modoCategoria === 'otra' ? CATEGORIA_OTRA : form.categoria}
            onChange={e => {
              const val = e.target.value;
              if (val === CATEGORIA_OTRA) { setModoCategoria('otra'); setForm(f => ({ ...f, categoria: '' })); }
              else                        { setModoCategoria('lista'); setForm(f => ({ ...f, categoria: val })); }
            }}
            className={inputCls()} style={INP}>
            <option value="" disabled>Selecciona una categoría</option>
            {CATEGORIAS_INSUMO.map(c => <option key={c} value={c}>{c}</option>)}
            <option value={CATEGORIA_OTRA}>Otra (escribir manualmente)</option>
          </select>
          {modoCategoria === 'otra' && (
            <input type="text" value={form.categoria} onChange={set('categoria')}
              placeholder="Escribe la categoría"
              className={inputCls('mt-2')} style={INP} />
          )}
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Precio / costo (S/)</label>
          <input type="number" min="0" step="0.01" value={form.precio} onChange={set('precio')}
            className={inputCls()} style={INP} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Unidad de medida</label>
            <select value={form.unidad_medida} onChange={set('unidad_medida')}
              className={inputCls()} style={INP}>
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Stock mínimo alerta</label>
            <input type="number" min="0" value={form.stock_minimo_cocina} onChange={set('stock_minimo_cocina')}
              className={inputCls()} style={INP} />
          </div>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
            Stock {producto ? 'actual' : 'inicial'}
          </label>
          <input
            type="number" min="0" step="0.01"
            value={form.stock_cocina} onChange={set('stock_cocina')}
            placeholder="0"
            className={inputCls()} style={INP}
          />
        </div>

        {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
      </div>
    </ModalBase>
  );
}

// ─── Modal ajustar stock de insumo (no se conecta a ventas/zonas) ────────────
function ModalAjustarInsumo({ producto, onClose, onSaved }: {
  producto: Producto; onClose: () => void; onSaved: () => void;
}) {
  const { usuario }             = useAuth();
  const [modo,      setModo]      = useState<'consumo' | 'ingreso'>('consumo');
  const [cantidad,  setCantidad]  = useState('');
  const [obs,       setObs]       = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const handleConfirmar = async () => {
    const cant = parseFloat(cantidad);
    if (!cant || cant <= 0) { setError('Ingresa una cantidad válida'); return; }
    if (modo === 'consumo' && cant > producto.stock_cocina) {
      setError(`No puedes descontar más de lo disponible (${producto.stock_cocina} ${producto.unidad_medida})`); return;
    }
    if (!usuario) { setError('No se pudo identificar tu sesión. Vuelve a iniciar sesión e intenta de nuevo.'); return; }
    setGuardando(true); setError('');
    try {
      const delta = modo === 'consumo' ? -cant : cant;
      await ajustarStockInsumo(producto.id, delta, usuario.id, obs || undefined, 'cocina');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar el movimiento');
    } finally {
      setGuardando(false);
    }
  };

  const stockResult = Math.max(0, producto.stock_cocina + (parseFloat(cantidad) || 0) * (modo === 'consumo' ? -1 : 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-sm shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Ajustar Stock</h2>
            <p className="text-xs" style={{ color: B.muted }}>{producto.nombre} · {producto.unidad_medida}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Stock actual */}
          <div className="rounded-xl p-3 text-center" style={{ background: B.cream }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: B.muted }}>Stock actual</p>
            <p className="text-3xl font-black" style={{ color: B.charcoal }}>{producto.stock_cocina}</p>
            <p className="text-xs" style={{ color: B.muted }}>{producto.unidad_medida}</p>
          </div>

          {/* Modo */}
          <div className="flex gap-2">
            <button onClick={() => setModo('consumo')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
              style={modo === 'consumo'
                ? { background: B.terra, color: B.cream }
                : { background: B.cream, color: B.charcoal }}>
              <TrendingDown className="w-4 h-4" /> Consumo
            </button>
            <button onClick={() => setModo('ingreso')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
              style={modo === 'ingreso'
                ? { background: B.green, color: B.cream }
                : { background: B.cream, color: B.charcoal }}>
              <TrendingUp className="w-4 h-4" /> Agregar
            </button>
          </div>

          {/* Cantidad */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>
              Cantidad a {modo === 'consumo' ? 'consumir' : 'agregar'}
            </label>
            <input type="number" min="0.01" step="0.01" value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="0" autoFocus
              className="w-full px-4 py-3 rounded-xl text-2xl font-bold text-center outline-none"
              style={{ ...INP, border: `2px solid ${B.creamDark}` }}
              onFocus={e => e.currentTarget.style.borderColor = modo === 'consumo' ? B.terra : B.green}
              onBlur={e => e.currentTarget.style.borderColor = B.creamDark} />
          </div>

          {/* Preview */}
          {cantidad && (
            <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: B.cream }}>
              <span className="text-sm" style={{ color: B.muted }}>Stock resultante:</span>
              <span className="text-lg font-black" style={{ color: stockResult < producto.stock_minimo_cocina ? B.terra : B.green }}>
                {stockResult} {producto.unidad_medida}
              </span>
            </div>
          )}

          {/* Observación */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Motivo (opcional)</label>
            <input type="text" value={obs} onChange={e => setObs(e.target.value)}
              placeholder={modo === 'consumo' ? 'Ej: Merma, producto dañado...' : 'Ej: Compra recibida...'}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={INP} />
          </div>

          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleConfirmar} disabled={guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: modo === 'consumo' ? B.terra : B.green, color: B.cream }}>
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tabla genérica de productos ──────────────────────────────────────────────
function TablaProductos({
  items, stockKey, minimoKey, color, onAjustar, onEditar, accionLabel, AccionIcon,
}: {
  items:      Producto[];
  stockKey:   'stock_cocina';
  minimoKey?: 'stock_minimo_cocina';
  color:      string;
  onAjustar:  (p: Producto) => void;
  onEditar?:  (p: Producto) => void;
  accionLabel: string;
  AccionIcon: React.ComponentType<{ className?: string }>;
}) {
  if (items.length === 0) return (
    <div className="py-12 flex flex-col items-center gap-2" style={{ color: B.muted }}>
      <Package className="w-10 h-10 opacity-30" />
      <p className="text-sm">Sin insumos registrados</p>
    </div>
  );

  return (
    <table className="w-full">
      <thead>
        <tr style={{ background: B.cream }}>
          {['Producto', 'Categoría', 'Precio', 'Stock', 'Acción'].map(h => (
            <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
              style={{ color: B.muted, width: h === 'Producto' ? '34%' : undefined }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map(p => {
          const stock  = p[stockKey];
          const minimo = minimoKey ? p[minimoKey] : 0;
          const isLow  = minimoKey ? stock < minimo : false;
          const pct    = minimo > 0
            ? Math.min((stock / (minimo * 3)) * 100, 100)
            : Math.min((stock / 30) * 100, 100);

          return (
            <tr key={p.id} style={{ borderTop: `1px solid ${B.cream}` }}
              onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {isLow && <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: B.terra }} />}
                  <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{p.nombre}</p>
                </div>
                <p className="text-xs" style={{ color: B.muted, paddingLeft: isLow ? '22px' : '0' }}>{p.unidad_medida}</p>
              </td>
              <td className="px-4 py-3">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: B.cream, color: B.charcoal }}>{p.categoria}</span>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: B.charcoal }}>S/ {p.precio.toFixed(2)}</td>
              <td className="px-4 py-3 w-40">
                <div className="flex items-center gap-2 mb-1">
                  <ProgressBar pct={pct} color={isLow ? B.terra : color} height={5} />
                  <span className="text-xs font-bold shrink-0" style={{ color: isLow ? B.terra : B.charcoal }}>{stock}</span>
                </div>
                {minimoKey && minimo > 0 && <p className="text-[10px]" style={{ color: B.muted }}>Mín: {minimo}</p>}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button onClick={() => onAjustar(p)}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg"
                    style={{ background: color, color: B.cream }}>
                    <AccionIcon className="w-3 h-3" /> {accionLabel}
                  </button>
                  {onEditar && (
                    <button onClick={() => onEditar(p)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
                      Editar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

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