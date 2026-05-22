// componentes/insumos/InsumosView.tsx
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Plus, AlertTriangle, Loader2, X, Minus,
  BarChart3, Calendar, TrendingDown, TrendingUp, Filter,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { Card, PageHeader, Btn, ProgressBar } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { crearProducto, actualizarProducto, ajustarStockInsumo } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';
import type { Producto } from '@/lib/supabase/types';

type UnidadKey = 'litros' | 'kg' | 'unidades' | 'bolsas' | 'cajas';
const UNIDADES: UnidadKey[] = ['kg', 'litros', 'unidades', 'bolsas', 'cajas'];

// ─── Tipos historial ──────────────────────────────────────────────────────────
interface HistorialItem {
  id: string;
  producto_id: string;
  producto_nombre: string;
  delta: number;           // negativo = consumo, positivo = ingreso
  stock_resultante: number;
  observacion: string | null;
  usuario_nombre: string | null;
  created_at: string;
}

type PeriodoFiltro = 'hoy' | 'semana' | 'mes';
type TipoFiltro    = 'todos' | 'consumo' | 'ingreso';

// ─── Formulario insumo ────────────────────────────────────────────────────────
interface FormState {
  nombre: string; categoria: string; unidad_medida: UnidadKey;
  stock_cocina: string; stock_minimo_cocina: string;
  precio: string; costo: string;
}
const FORM_VACIO: FormState = {
  nombre: '', categoria: '', unidad_medida: 'kg',
  stock_cocina: '0', stock_minimo_cocina: '5', precio: '0', costo: '0',
};

// ─── Modal Insumo ─────────────────────────────────────────────────────────────
function ModalInsumo({ insumo, onClose, onSaved }: {
  insumo: Producto | null; onClose: () => void; onSaved: () => void;
}) {
  const [form,      setForm]      = useState<FormState>(insumo
    ? { nombre: insumo.nombre, categoria: insumo.categoria, unidad_medida: insumo.unidad_medida as UnidadKey,
        stock_cocina: String(insumo.stock_cocina), stock_minimo_cocina: String(insumo.stock_minimo_cocina),
        precio: String(insumo.precio), costo: String(insumo.costo ?? 0) }
    : FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const inp: React.CSSProperties = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };

  const handleGuardar = async () => {
    if (!form.nombre.trim())    { setError('El nombre es obligatorio'); return; }
    if (!form.categoria.trim()) { setError('La categoría es obligatoria'); return; }
    setGuardando(true); setError('');
    try {
      const payload = {
        nombre: form.nombre.trim(), categoria: form.categoria.trim(),
        tipo: 'insumo' as const, unidad_medida: form.unidad_medida,
        stock_cocina: parseInt(form.stock_cocina) || 0,
        stock_minimo_cocina: parseInt(form.stock_minimo_cocina) || 5,
        precio: parseFloat(form.precio) || 0, costo: parseFloat(form.costo) || 0,
        stock_tienda: 0, stock_general: 0, stock_minimo_tienda: 0, activo: true,
      };
      if (insumo) await actualizarProducto(insumo.id, payload);
      else        await crearProducto(payload as Parameters<typeof crearProducto>[0]);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>{insumo ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {[
            { key: 'nombre' as const,    label: 'Nombre del insumo', ph: 'Ej: Arroz, Harina, Huevo...', type: 'text' },
            { key: 'categoria' as const, label: 'Categoría',         ph: 'Ej: Cereales, Lácteos, Carnes...', type: 'text' },
          ].map(({ key, label, ph, type }) => (
            <div key={key}>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>{label}</label>
              <input type={type} value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Unidad</label>
              <select value={form.unidad_medida}
                onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value as UnidadKey }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Precio unit. (S/)</label>
              <input type="number" value={form.precio}
                onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                placeholder="0.00" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Stock cocina</label>
              <input type="number" value={form.stock_cocina}
                onChange={e => setForm(f => ({ ...f, stock_cocina: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Stock mínimo</label>
              <input type="number" value={form.stock_minimo_cocina}
                onChange={e => setForm(f => ({ ...f, stock_minimo_cocina: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}>
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            {insumo ? 'Guardar' : 'Crear insumo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Consumo (antes: Ajuste Stock) ─────────────────────────────────────
function ModalConsumo({ insumo, onClose, onSaved }: {
  insumo: Producto; onClose: () => void; onSaved: () => void;
}) {
  const { usuario } = useAuth();
  const [modo,      setModo]      = useState<'consumo' | 'ingreso'>('consumo');
  const [cantidad,  setCantidad]  = useState('');
  const [obs,       setObs]       = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const inp: React.CSSProperties = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };

  const handleConfirmar = async () => {
    const cant = parseFloat(cantidad);
    if (!cant || cant <= 0) { setError('Ingresa una cantidad válida'); return; }
    if (modo === 'consumo' && cant > insumo.stock_cocina) {
      setError(`No puedes descontar más de lo disponible (${insumo.stock_cocina} ${insumo.unidad_medida})`); return;
    }
    if (!usuario) return;
    setGuardando(true); setError('');
    try {
      const delta = modo === 'consumo' ? -cant : cant;
      await ajustarStockInsumo(insumo.id, delta, usuario.id, obs || undefined);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar consumo');
    } finally {
      setGuardando(false);
    }
  };

  const stockResult = Math.max(0, insumo.stock_cocina + (parseFloat(cantidad) || 0) * (modo === 'consumo' ? -1 : 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-sm shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Registrar Consumo</h2>
            <p className="text-xs" style={{ color: B.muted }}>{insumo.nombre} · {insumo.unidad_medida}</p>
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
            <p className="text-3xl font-black" style={{ color: B.charcoal }}>{insumo.stock_cocina}</p>
            <p className="text-xs" style={{ color: B.muted }}>{insumo.unidad_medida}</p>
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
              style={{ ...inp, border: `2px solid ${B.creamDark}` }}
              onFocus={e => e.currentTarget.style.borderColor = modo === 'consumo' ? B.terra : B.green}
              onBlur={e => e.currentTarget.style.borderColor = B.creamDark} />
          </div>

          {/* Preview */}
          {cantidad && (
            <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: B.cream }}>
              <span className="text-sm" style={{ color: B.muted }}>Stock resultante:</span>
              <span className="text-lg font-black" style={{ color: stockResult < insumo.stock_minimo_cocina ? B.terra : B.green }}>
                {stockResult} {insumo.unidad_medida}
              </span>
            </div>
          )}

          {/* Observación */}
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Motivo (opcional)</label>
            <input type="text" value={obs} onChange={e => setObs(e.target.value)}
              placeholder={modo === 'consumo' ? 'Ej: Usado en preparación de queques...' : 'Ej: Compra adicional recibida...'}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
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

// ─── Modal Historial de Consumo ───────────────────────────────────────────────
function ModalHistorial({ onClose }: {
  onClose: () => void;
}) {
  const [historial,   setHistorial]   = useState<HistorialItem[]>([]);
  const [cargando,    setCargando]    = useState(true);
  const [periodo,     setPeriodo]     = useState<PeriodoFiltro>('hoy');
  const [tipoFiltro,  setTipoFiltro]  = useState<TipoFiltro>('todos');
  const [insumoBusc,  setInsumoBusc]  = useState('');

  const cargar = useCallback(() => {
    // Diferir para evitar setState síncrono en el effect
    setTimeout(async () => {
      setCargando(true);
      try {
      // Calcular fecha inicio según período
      const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
      let fechaInicio: string;
      if (periodo === 'hoy') {
        fechaInicio = ahora.toISOString().split('T')[0];
      } else if (periodo === 'semana') {
        const lunes = new Date(ahora);
        lunes.setDate(ahora.getDate() - (ahora.getDay() === 0 ? 6 : ahora.getDay() - 1));
        fechaInicio = lunes.toISOString().split('T')[0];
      } else {
        fechaInicio = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`;
      }

      // Consultar movimientos_almacen filtrando por tipo consumo/ajuste en cocina
      const { data, error } = await supabase
        .from('movimientos_almacen')
        .select(`
          id,
          producto_id,
          tipo,
          cantidad,
          stock_cocina_despues,
          observacion,
          created_at,
          producto:productos(nombre),
          usuario:usuarios(nombre)
        `)
        .in('tipo', ['ajuste', 'salida_cocina', 'traslado'])
        .gte('created_at', `${fechaInicio}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const items: HistorialItem[] = (data ?? []).map((r: Record<string, unknown>) => {
        const prod = r.producto as Record<string, unknown> | null;
        const usr  = r.usuario  as Record<string, unknown> | null;
        // Determinar delta: cantidad positiva = ingreso, negativa = consumo
        // stock_cocina_antes - stock_cocina_despues para detectar consumo
        const delta = r.tipo === 'salida_cocina' ? -(r.cantidad as number) : (r.cantidad as number);
        return {
          id:               r.id as string,
          producto_id:      r.producto_id as string,
          producto_nombre:  prod ? (prod.nombre as string) : (r.producto_id as string),
          delta,
          stock_resultante: r.stock_cocina_despues as number ?? 0,
          observacion:      r.observacion as string | null,
          usuario_nombre:   usr ? (usr.nombre as string) : null,
          created_at:       r.created_at as string,
        };
      });

      setHistorial(items);
      } catch (e) {
        console.error('Error al cargar historial:', e);
      } finally {
        setCargando(false);
      }
    }, 0); // fin setTimeout
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel('historial-insumos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movimientos_almacen' }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [cargar]);

  const filtrados = useMemo(() => historial.filter(h => {
    const matchTipo = tipoFiltro === 'todos'
      || (tipoFiltro === 'consumo' && h.delta < 0)
      || (tipoFiltro === 'ingreso' && h.delta > 0);
    const matchInsumo = !insumoBusc || h.producto_nombre.toLowerCase().includes(insumoBusc.toLowerCase());
    return matchTipo && matchInsumo;
  }), [historial, tipoFiltro, insumoBusc]);

  const totalConsumo = filtrados.filter(h => h.delta < 0).reduce((s, h) => s + Math.abs(h.delta), 0);
  const totalIngreso = filtrados.filter(h => h.delta > 0).reduce((s, h) => s + h.delta, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: B.cream }}>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: B.terra }} />
            <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Historial de Consumo</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros unificados */}
        <div className="px-6 py-4 shrink-0 space-y-3" style={{ borderBottom: `1px solid ${B.cream}` }}>
          {/* Fila 1: Período */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 shrink-0" style={{ color: B.muted }} />
            <span className="text-xs font-black uppercase tracking-wide" style={{ color: B.muted }}>Período:</span>
            {([
              { key: 'hoy'   as PeriodoFiltro, label: 'Hoy'     },
              { key: 'semana'as PeriodoFiltro, label: 'Semana'  },
              { key: 'mes'   as PeriodoFiltro, label: 'Mes'     },
            ]).map(p => (
              <button key={p.key} onClick={() => setPeriodo(p.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={periodo === p.key
                  ? { background: B.charcoal, color: B.cream }
                  : { background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Fila 2: Tipo + Búsqueda de insumo */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 shrink-0" style={{ color: B.muted }} />
            <span className="text-xs font-black uppercase tracking-wide" style={{ color: B.muted }}>Tipo:</span>
            {([
              { key: 'todos'   as TipoFiltro, label: 'Todos'   },
              { key: 'consumo' as TipoFiltro, label: 'Consumo' },
              { key: 'ingreso' as TipoFiltro, label: 'Ingreso' },
            ]).map(t => (
              <button key={t.key} onClick={() => setTipoFiltro(t.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={tipoFiltro === t.key
                  ? { background: t.key === 'consumo' ? B.terra : t.key === 'ingreso' ? B.green : B.charcoal, color: B.cream }
                  : { background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}>
                {t.label}
              </button>
            ))}
            <div className="flex-1 min-w-40 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: B.muted }} />
              <input value={insumoBusc} onChange={e => setInsumoBusc(e.target.value)}
                placeholder="Buscar insumo..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none"
                style={{ background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal }} />
            </div>
          </div>

          {/* KPIs del período */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-3"
              style={{ background: '#fef0e6', border: `1px solid ${B.terra}20` }}>
              <TrendingDown className="w-4 h-4 shrink-0" style={{ color: B.terra }} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: B.terra }}>Total consumido</p>
                <p className="text-lg font-black" style={{ color: B.terra }}>{totalConsumo.toFixed(2)}</p>
              </div>
            </div>
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-3"
              style={{ background: '#e8f5e2', border: `1px solid ${B.green}20` }}>
              <TrendingUp className="w-4 h-4 shrink-0" style={{ color: B.green }} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: B.green }}>Total ingresado</p>
                <p className="text-lg font-black" style={{ color: B.green }}>{totalIngreso.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista historial */}
        <div className="overflow-y-auto flex-1">
          {cargando ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: B.green }} /></div>
          ) : filtrados.length === 0 ? (
            <div className="py-16 text-center" style={{ color: B.muted }}>
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin registros en este período</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0" style={{ background: B.cream }}>
                <tr>
                  {['Fecha/Hora', 'Insumo', 'Movimiento', 'Stock res.', 'Motivo', 'Usuario'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
                      style={{ color: B.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(h => {
                  const esConsumo = h.delta < 0;
                  return (
                    <tr key={h.id} style={{ borderTop: `1px solid ${B.cream}` }}
                      onMouseEnter={e => e.currentTarget.style.background = `${B.cream}50`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-3 text-xs" style={{ color: B.muted }}>
                        {new Date(h.created_at).toLocaleDateString('es-PE')}<br />
                        <span className="text-[10px]">{new Date(h.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: B.charcoal }}>{h.producto_nombre}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm font-black"
                          style={{ color: esConsumo ? B.terra : B.green }}>
                          {esConsumo ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                          {esConsumo ? '' : '+'}{h.delta.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: B.charcoal }}>{h.stock_resultante.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: B.muted }}>{h.observacion ?? '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: B.muted }}>{h.usuario_nombre ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────
export default function InsumosView() {
  const { productos, isLoading, refetchProductos } = useGlobalData();
  const [busqueda,      setBusqueda]      = useState('');
  const [catFiltro,     setCatFiltro]     = useState('Todos');
  const [modal,         setModal]         = useState<{ open: boolean; insumo: Producto | null }>({ open: false, insumo: null });
  const [modalConsumo,  setModalConsumo]  = useState<Producto | null>(null);
  const [modalHistorial,setModalHistorial]= useState(false);

  const insumos = useMemo(() => productos.filter(p => p.tipo === 'insumo' && p.activo), [productos]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel('insumos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => refetchProductos())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetchProductos]);

  const categorias = useMemo(() => {
    const cats = [...new Set(insumos.map(i => i.categoria))].sort();
    return ['Todos', ...cats];
  }, [insumos]);

  const bajos = insumos.filter(i => i.stock_cocina < i.stock_minimo_cocina);

  const filtrados = useMemo(() => insumos.filter(i => {
    const matchQ = i.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchC = catFiltro === 'Todos' || i.categoria === catFiltro;
    return matchQ && matchC;
  }), [insumos, busqueda, catFiltro]);

  const valorTotal = insumos.reduce((a, i) => a + i.stock_cocina * i.precio, 0);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Insumos de Cocina" subtitle="Inventario de materia prima e ingredientes"
        action={
          <div className="flex gap-2">
            <button onClick={() => setModalHistorial(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: B.terra, color: B.cream }}>
              <BarChart3 className="w-4 h-4" />Historial
            </button>
            <Btn onClick={() => setModal({ open: true, insumo: null })}><Plus className="w-4 h-4" />Nuevo Insumo</Btn>
          </div>
        } />

      {bajos.length > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3 mb-5"
          style={{ background: '#fef0e6', border: `1px solid ${B.terra}30` }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: B.terra }} />
          <div>
            <p className="text-sm font-bold" style={{ color: B.terra }}>{bajos.length} insumos bajo el mínimo</p>
            <p className="text-xs mt-0.5" style={{ color: B.terra }}>{bajos.map(i => i.nombre).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Insumos',  value: insumos.length,              unit: 'productos',    color: B.charcoal },
          { label: 'Stock Bajo',     value: bajos.length,                unit: 'por reponer',  color: B.terra    },
          { label: 'Valor en Cocina',value: `S/ ${Math.round(valorTotal)}`,unit: 'estimado',  color: B.green    },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-widest" style={{ color: B.muted }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: B.muted }}>{s.unit}</p>
          </Card>
        ))}
      </div>

      {/* Filtros unificados en una sola línea */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Buscador */}
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: B.muted }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar insumo..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: B.white, border: `1px solid ${B.cream}`, color: B.charcoal }} />
        </div>
        {/* Categorías inline */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {categorias.map(c => (
            <button key={c} onClick={() => setCatFiltro(c)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={catFiltro === c
                ? { background: B.charcoal, color: B.cream }
                : { background: B.white, color: B.charcoal, border: `1px solid ${B.cream}` }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: B.cream }}>
              {['Insumo', 'Categoría', 'Stock cocina / Mín.', 'Precio unit.', 'Acción'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
                  style={{ color: B.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(ins => {
              const low = ins.stock_cocina < ins.stock_minimo_cocina;
              const pct = Math.min((ins.stock_cocina / Math.max(ins.stock_minimo_cocina * 3, 1)) * 100, 100);
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
                      <span className="text-xs font-bold shrink-0" style={{ color: low ? B.terra : B.charcoal }}>{ins.stock_cocina}</span>
                    </div>
                    <p className="text-[10px]" style={{ color: B.muted }}>Mín: {ins.stock_minimo_cocina}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: B.charcoal }}>S/ {ins.precio.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {/* Botón CONSUMO (antes: Stock) */}
                      <button onClick={() => setModalConsumo(ins)}
                        className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: B.terra, color: B.cream }}>
                        <Minus className="w-3 h-3" /> Consumo
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
            {insumos.length === 0 ? 'Sin insumos registrados aún' : 'No hay resultados'}
          </div>
        )}
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