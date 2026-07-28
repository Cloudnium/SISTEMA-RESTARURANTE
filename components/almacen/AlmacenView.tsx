// componentes/almacen/AlmacenView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, X, Package, AlertTriangle, ArrowUpDown, Loader2, Plus,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Btn, ProgressBar, Paginacion } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { crearProducto, actualizarProducto, ajustarStockInsumo } from '@/lib/supabase/queries';
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
interface ProductoForm {
  nombre: string; categoria: string; precio: string; costo: string;
  unidad_medida: string; stock_minimo_cocina: string; stock_cocina: string;
}
const PROD_VACIO: ProductoForm = {
  nombre: '', categoria: '', precio: '0', costo: '0',
  unidad_medida: 'unidades', stock_minimo_cocina: '0', stock_cocina: '0',
};

function ModalProducto({ producto, onClose, onSaved }: {
  producto: Producto | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductoForm>(producto ? {
    nombre:               producto.nombre,
    categoria:            producto.categoria,
    precio:               String(producto.precio),
    costo:                String(producto.costo ?? 0),
    unidad_medida:        producto.unidad_medida,
    stock_minimo_cocina:  String(producto.stock_minimo_cocina),
    stock_cocina:         String(producto.stock_cocina ?? 0),
  } : PROD_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const set = (key: keyof ProductoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre.trim())    { setError('El nombre es obligatorio'); return; }
    if (!form.categoria.trim()) { setError('La categoría es obligatoria'); return; }
    setGuardando(true); setError('');
    try {
      const base = {
        nombre:               form.nombre.trim(),
        categoria:            form.categoria.trim(),
        tipo:                 'insumo' as const,
        precio:               parseFloat(form.precio) || 0,
        costo:                parseFloat(form.costo)  || 0,
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
        <div className="grid grid-cols-1 gap-3">
          {([
            { key: 'nombre' as const,    label: 'Nombre del insumo', ph: 'Ej: Huevo, Gelatina en polvo 100g...' },
            { key: 'categoria' as const, label: 'Categoría',         ph: 'Ej: Lácteos, Cereales, Insumos secos...' },
          ]).map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>{label}</label>
              <input type="text" value={form[key]} onChange={set(key)}
                placeholder={ph} className={inputCls()} style={INP} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Precio / costo ref. (S/)</label>
            <input type="number" min="0" step="0.01" value={form.precio} onChange={set('precio')}
              className={inputCls()} style={INP} />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Costo unitario (S/)</label>
            <input type="number" min="0" step="0.01" value={form.costo} onChange={set('costo')}
              className={inputCls()} style={INP} />
          </div>
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
  const [modo,      setModo]      = useState<'ingreso' | 'consumo'>('ingreso');
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
    if (!usuario) { setError('No se pudo identificar tu sesión. Vuelve a iniciar sesión.'); return; }
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
    <ModalBase title="Ajustar Stock" subtitle={producto.nombre} onClose={onClose}
      actions={<>
        <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: B.cream, color: B.charcoal }} onClick={onClose}>Cancelar</button>
        <button onClick={handleConfirmar} disabled={guardando}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: modo === 'consumo' ? B.terra : B.green, color: B.cream }}>
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          Confirmar
        </button>
      </>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setModo('ingreso')}
            className="py-2.5 rounded-xl text-sm font-bold"
            style={modo === 'ingreso' ? { background: B.green, color: B.cream } : { background: B.cream, color: B.charcoal }}>
            + Ingreso
          </button>
          <button onClick={() => setModo('consumo')}
            className="py-2.5 rounded-xl text-sm font-bold"
            style={modo === 'consumo' ? { background: B.terra, color: B.cream } : { background: B.cream, color: B.charcoal }}>
            − Consumo
          </button>
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>
            Cantidad {modo === 'consumo' && <span style={{ fontWeight: 400 }}>(máx. {producto.stock_cocina})</span>}
          </label>
          <input type="number" min="0.01" step="0.01" value={cantidad}
            onChange={e => setCantidad(e.target.value)} placeholder="0" autoFocus
            className="w-full px-4 py-3 rounded-xl text-xl font-bold outline-none"
            style={{ ...INP, border: `2px solid ${B.creamDark}` }}
            onFocus={e => e.currentTarget.style.borderColor = modo === 'consumo' ? B.terra : B.green}
            onBlur={e => e.currentTarget.style.borderColor = B.creamDark} />
        </div>
        <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: B.cream }}>
          <span className="text-xs font-semibold" style={{ color: B.muted }}>Stock resultante</span>
          <span className="text-lg font-black" style={{ color: stockResult < producto.stock_minimo_cocina ? B.terra : B.green }}>
            {stockResult} {producto.unidad_medida}
          </span>
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-wide block mb-1" style={{ color: B.muted }}>Motivo (opcional)</label>
          <input type="text" value={obs} onChange={e => setObs(e.target.value)}
            placeholder={modo === 'consumo' ? 'Ej: Usado en preparación...' : 'Ej: Compra recibida...'}
            className={inputCls()} style={INP} />
        </div>
        {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
      </div>
    </ModalBase>
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
              style={{ color: B.muted }}>{h}</th>
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
  const [modalAjuste,setModalAjuste]=useState<Producto | null>(null);
  const [modalProd,  setModalProd] = useState<{ open: boolean; producto: Producto | null }>({ open: false, producto: null });
  const [pagina,     setPagina]    = useState(1);
  const POR_PAGINA = 20;

  const insumos = useMemo(() => {
    const q = busqueda.toLowerCase();
    return productos
      .filter(p => p.activo && p.tipo === 'insumo')
      .filter(p => !q || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos, busqueda]);

  const [prevBusqueda, setPrevBusqueda] = useState(busqueda);
  if (busqueda !== prevBusqueda) { setPrevBusqueda(busqueda); setPagina(1); }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  const totalPaginas = Math.max(1, Math.ceil(insumos.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles      = insumos.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  const valorTotal  = insumos.reduce((a, p) => a + p.stock_cocina * (p.costo ?? p.precio), 0);
  const bajosAlerta = insumos.filter(p => p.stock_cocina < p.stock_minimo_cocina);

  return (
    <div>
      <PageHeader
        title="Almacén"
        subtitle="Insumos y materia prima"
        action={
          <Btn onClick={() => setModalProd({ open: true, producto: null })}>
            <Plus className="w-4 h-4" />Nuevo Insumo
          </Btn>
        }
      />

      {/* Descripción */}
      <div className="rounded-xl px-4 py-2.5 mb-4 text-xs font-medium"
        style={{ background: B.cream, color: B.muted }}>
        🌾 Materia prima e ingredientes (arroz, harina, huevo, gelatina en polvo, etc.). No están conectados a ventas — ajusta su stock manualmente aquí.
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total insumos',    value: insumos.length,               color: B.charcoal },
          { label: 'Con alerta stock', value: bajosAlerta.length,           color: B.terra    },
          { label: 'Valor en almacén', value: `S/ ${valorTotal.toFixed(2)}`,color: B.terra    },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: B.muted }}>{s.label}</p>
            <p className="text-xl font-black mt-0.5" style={{ color: s.color }}>{s.value}</p>
          </div>
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

      {/* Búsqueda */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar insumo / materia prima..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }} />
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