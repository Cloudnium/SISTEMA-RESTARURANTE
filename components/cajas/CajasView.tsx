'use client';

import React, { useState } from 'react';
import {
  Plus, DollarSign, Eye, Lock, TrendingDown,
  Edit, Trash2, Loader2, X, CheckCircle, CreditCard,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, KpiCard, Btn } from '@/components/ui';
import { useGlobalData } from '@/context/GlobalDataContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { abrirCaja, cerrarCaja, crearCaja, getMovimientosCaja, registrarEgresoCaja } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';
import type { Caja, MovimientoCaja } from '@/lib/supabase/types';

// ─── Modal Apertura ───────────────────────────────────────────────────────────
function ModalApertura({ caja, onClose, onSaved }: { caja: Caja; onClose: () => void; onSaved: () => void }) {
  const { usuario }           = useAuth();
  const [monto,   setMonto]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleAbrir = async () => {
    if (!usuario) return;
    setLoading(true); setError('');
    try {
      await abrirCaja(caja.id, usuario.id, parseFloat(monto) || 0);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al abrir caja'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-sm shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Abrir {caja.nombre}</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Monto inicial (S/)</label>
            <input type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
              placeholder="0.00" autoFocus
              className="w-full px-4 py-3 rounded-xl text-lg font-bold outline-none"
              style={{ background: B.cream, border: `2px solid ${B.creamDark}`, color: B.charcoal }}
              onFocus={e => e.currentTarget.style.borderColor = B.green}
              onBlur={e => e.currentTarget.style.borderColor = B.creamDark} />
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleAbrir} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Abrir caja
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Cierre ─────────────────────────────────────────────────────────────
function ModalCierre({ caja, onClose, onSaved }: { caja: Caja; onClose: () => void; onSaved: () => void }) {
  const { usuario }                   = useAuth();
  const [loading,    setLoading]      = useState(false);
  const [saldoFinal, setSaldoFinal]   = useState<number | null>(null);
  const [error,      setError]        = useState('');

  const handleCerrar = async () => {
    if (!usuario) return;
    setLoading(true); setError('');
    try {
      const saldo = await cerrarCaja(caja.id, usuario.id);
      setSaldoFinal(saldo);
      setTimeout(() => { onSaved(); }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cerrar caja');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-sm shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Cerrar {caja.nombre}</h2>
        </div>
        <div className="p-6">
          {saldoFinal !== null ? (
            <div className="flex flex-col items-center py-4 gap-3">
              <CheckCircle className="w-14 h-14" style={{ color: B.green }} />
              <p className="text-lg font-bold" style={{ color: B.charcoal }}>Caja cerrada</p>
              <div className="rounded-xl p-4 w-full text-center" style={{ background: B.cream }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: B.muted }}>Saldo final</p>
                <p className="text-3xl font-black" style={{ color: B.green }}>S/ {saldoFinal.toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl p-4 mb-4" style={{ background: B.cream }}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: B.muted }}>Saldo actual</span>
                  <span className="font-bold" style={{ color: B.charcoal }}>S/ {caja.monto_actual.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-sm text-center mb-4" style={{ color: B.muted }}>¿Confirmas el cierre de esta caja?</p>
              {error && <p className="text-xs px-3 py-2 rounded-xl mb-3" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
                <button onClick={handleCerrar} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: B.terra, color: B.cream }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cerrar caja
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Reporte ────────────────────────────────────────────────────────────
function ModalReporte({ caja, onClose }: { caja: Caja; onClose: () => void }) {
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [loading,     setLoading]     = useState(true);

  React.useEffect(() => {
    getMovimientosCaja(caja.id)
      .then(data => setMovimientos(data as MovimientoCaja[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [caja.id]);

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0);
  const totalEgresos  = movimientos.filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col"
        style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Reporte · {caja.nombre}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Saldo inicial', value: caja.monto_inicial, color: B.charcoal },
              { label: 'Ingresos',      value: totalIngresos,      color: B.green   },
              { label: 'Egresos',       value: totalEgresos,       color: B.terra   },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: B.cream }}>
                <p className="text-xs" style={{ color: B.muted }}>{s.label}</p>
                <p className="text-lg font-black mt-0.5" style={{ color: s.color }}>S/ {s.value.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-3 mb-5 text-center"
            style={{ background: `${B.green}12`, border: `1px solid ${B.green}30` }}>
            <p className="text-xs" style={{ color: B.green }}>Saldo actual</p>
            <p className="text-2xl font-black" style={{ color: B.green }}>S/ {caja.monto_actual.toFixed(2)}</p>
          </div>
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: B.muted }}>
            Movimientos ({movimientos.length})
          </p>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin" style={{ color: B.green }} /></div>
          ) : movimientos.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: B.muted }}>Sin movimientos registrados</p>
          ) : (
            <div className="space-y-2">
              {movimientos.slice(0, 20).map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: B.cream }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: B.charcoal }}>{m.concepto}</p>
                    <p className="text-xs" style={{ color: B.muted }}>
                      {new Date(m.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="text-sm font-black" style={{ color: m.tipo === 'ingreso' ? B.green : B.terra }}>
                    {m.tipo === 'ingreso' ? '+' : '-'}S/ {m.monto.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Egreso ─────────────────────────────────────────────────────────────
function ModalEgreso({ caja, onClose, onSaved }: { caja: Caja; onClose: () => void; onSaved: () => void }) {
  const { usuario }             = useAuth();
  const [concepto, setConcepto] = useState('');
  const [monto,    setMonto]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleRegistrar = async () => {
    if (!concepto.trim())                     { setError('Ingresa un concepto'); return; }
    if (!monto || parseFloat(monto) <= 0)     { setError('Ingresa un monto válido'); return; }
    if (parseFloat(monto) > caja.monto_actual){ setError(`Saldo insuficiente. Disponible: S/ ${caja.monto_actual.toFixed(2)}`); return; }
    if (!usuario) return;
    setLoading(true); setError('');
    try {
      await registrarEgresoCaja(caja.id, concepto, parseFloat(monto), usuario.id);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al registrar egreso'); }
    finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-sm shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Registrar Egreso · {caja.nombre}</h2>
        </div>
        <div className="p-6 space-y-3">
          {/* Saldo disponible */}
          <div className="rounded-xl px-4 py-3 flex justify-between items-center"
            style={{ background: `${B.green}10`, border: `1px solid ${B.green}25` }}>
            <span className="text-xs font-bold" style={{ color: B.green }}>Saldo disponible</span>
            <span className="text-base font-black" style={{ color: B.green }}>S/ {caja.monto_actual.toFixed(2)}</span>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Concepto</label>
            <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)}
              placeholder="Ej: Pago proveedor, Gastos varios..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Monto (S/)</label>
            <input type="number" min="0.01" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
              placeholder="0.00" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleRegistrar} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.terra, color: B.cream }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Registrar egreso
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Editar Caja ────────────────────────────────────────────────────────
function ModalEditarCaja({ caja, onClose, onSaved, usuarios }: {
  caja: Caja; onClose: () => void; onSaved: () => void;
  usuarios: Array<{ id: string; nombre: string }>;
}) {
  const [nombre,    setNombre]    = useState(caja.nombre);
  const [usuarioId, setUsuarioId] = useState(caja.usuario_id ?? '');
  const [zona,      setZona]      = useState(caja.zona ?? '');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleGuardar = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setLoading(true); setError('');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      await db.from('cajas').update({
        nombre:     nombre.trim(),
        usuario_id: usuarioId || null,
        zona:       zona || null,
      }).eq('id', caja.id);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
    finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-sm shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Editar · {caja.nombre}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: B.muted }}
            onMouseEnter={e => e.currentTarget.style.background = B.cream}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Nombre</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Zona</label>
            <select value={zona} onChange={e => setZona(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
              <option value="">Sin zona</option>
              <option value="Salón Principal">Salón Principal</option>
              <option value="Terraza">Terraza</option>
              <option value="Barra">Barra</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Usuario asignado</label>
            <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
              <option value="">Sin usuario asignado</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Nueva Caja ─────────────────────────────────────────────────────────
function ModalNuevaCaja({ onClose, onSaved, usuarios }: {
  onClose: () => void; onSaved: () => void;
  usuarios: Array<{ id: string; nombre: string }>;
}) {
  const [nombre,    setNombre]    = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [zona,      setZona]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleCrear = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setLoading(true); setError('');
    try {
      await crearCaja(nombre, usuarioId || null, zona || undefined);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al crear caja'); }
    finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-sm shadow-2xl" style={{ background: B.white }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b" style={{ borderColor: B.cream }}>
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>Nueva Caja</h2>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Nombre *</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Caja 4"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Zona (opcional)</label>
            <select value={zona} onChange={e => setZona(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
              <option value="">Sin zona específica</option>
              <option value="Salón Principal">Salón Principal</option>
              <option value="Terraza">Terraza</option>
              <option value="Barra">Barra</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide block mb-1.5" style={{ color: B.muted }}>Usuario asignado</label>
            <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
              <option value="">Sin usuario asignado</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef0e6', color: B.terra }}>{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}>Cancelar</button>
          <button onClick={handleCrear} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear caja
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Caja Card ────────────────────────────────────────────────────────────────
function CajaCard({ caja, onAbrir, onCerrar, onReporte, onEgreso, onEditar, onEliminar }: {
  caja: Caja;
  onAbrir:   (c: Caja) => void;
  onCerrar:  (c: Caja) => void;
  onReporte: (c: Caja) => void;
  onEgreso:  (c: Caja) => void;
  onEditar:  (c: Caja) => void;
  onEliminar:(c: Caja) => void;
}) {
  const abierta = caja.estado === 'abierta';

  return (
    <div className="rounded-2xl p-5" style={{ background: B.white, border: `1px solid ${B.cream}` }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold" style={{ color: B.charcoal }}>{caja.nombre}</h3>
          <p className="text-sm" style={{ color: B.muted }}>{caja.usuario?.nombre ?? 'Sin asignar'}</p>
          {caja.zona && <p className="text-xs mt-0.5" style={{ color: B.muted }}>{caja.zona}</p>}
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={abierta ? { background: '#e8f5e2', color: B.green } : { background: '#fee2e2', color: B.terra }}>
          {abierta ? 'Abierta' : 'Cerrada'}
        </span>
      </div>

      <div className="space-y-1.5 mb-4 pb-4 border-b" style={{ borderColor: B.cream }}>
        <div className="flex justify-between text-sm">
          <span style={{ color: B.muted }}>Saldo inicial</span>
          <span className="font-semibold" style={{ color: B.charcoal }}>S/ {caja.monto_inicial.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: B.muted }}>Saldo actual</span>
          <span className="text-lg font-black" style={{ color: B.green }}>S/ {caja.monto_actual.toFixed(2)}</span>
        </div>
      </div>

      {caja.fecha_apertura && (
        <div className="text-xs space-y-0.5 mb-4" style={{ color: B.muted }}>
          <p>Apertura: {new Date(caja.fecha_apertura).toLocaleString('es-PE', { timeZone: 'America/Lima', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</p>
          {caja.fecha_cierre && <p>Cierre: {new Date(caja.fecha_cierre).toLocaleString('es-PE', { timeZone: 'America/Lima', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</p>}
        </div>
      )}

      <div className="space-y-2">
        {/* Botones principales */}
        <div className="flex gap-2">
          {!abierta ? (
            <button onClick={() => onAbrir(caja)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold"
              style={{ background: B.green, color: B.cream }}>
              <CheckCircle className="w-4 h-4" /> Abrir
            </button>
          ) : (
            <button onClick={() => onCerrar(caja)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold"
              style={{ background: B.terra, color: B.cream }}>
              <Lock className="w-4 h-4" /> Cerrar
            </button>
          )}
          <button onClick={() => onReporte(caja)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold"
            style={{ background: B.charcoal, color: B.cream }}>
            <Eye className="w-4 h-4" /> Reporte
          </button>
        </div>

        {/* Acciones secundarias — disponibles siempre */}
        <div className="grid grid-cols-3 gap-2">
          {/* FIX: Egreso disponible solo cuando la caja está ABIERTA (tenía la lógica invertida) */}
          <button
            onClick={() => onEgreso(caja)}
            disabled={!abierta}
            title={!abierta ? 'Abre la caja primero para registrar egresos' : 'Registrar egreso'}
            className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#fef0e6', color: B.terra }}>
            <TrendingDown className="w-3.5 h-3.5" /> Egreso
          </button>
          {/* FIX: Editar ahora funciona */}
          <button onClick={() => onEditar(caja)}
            className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: B.cream, color: B.charcoal }}
            onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
            onMouseLeave={e => e.currentTarget.style.background = B.cream}>
            <Edit className="w-3.5 h-3.5" /> Editar
          </button>
          <button onClick={() => onEliminar(caja)}
            disabled={abierta}
            title={abierta ? 'Cierra la caja antes de eliminar' : 'Eliminar caja'}
            className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#fee2e2', color: B.terra }}>
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
        </div>

        {!abierta && (
          <p className="text-[10px] text-center py-1.5 rounded-lg" style={{ background: `${B.green}10`, color: B.green }}>
            💡 Se abrirá automáticamente al iniciar sesión
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
type ModalState =
  | { tipo: 'apertura'; caja: Caja }
  | { tipo: 'cierre';   caja: Caja }
  | { tipo: 'reporte';  caja: Caja }
  | { tipo: 'egreso';   caja: Caja }
  | { tipo: 'editar';   caja: Caja }
  | { tipo: 'nueva' }
  | null;

export function CajasView() {
  const { cajas, usuarios, isLoading, refetchCajas } = useGlobalData();
  const [modal, setModal] = useState<ModalState>(null);

  const totalEnCajas = cajas.reduce((a, c) => a + c.monto_actual, 0);
  const abiertas     = cajas.filter(c => c.estado === 'abierta').length;
  const cerradas     = cajas.filter(c => c.estado === 'cerrada').length;

  const handleEliminar = async (caja: Caja) => {
    if (caja.estado === 'abierta') return; // guard extra — el botón ya debería estar disabled
    if (!confirm(`¿Eliminar ${caja.nombre}? Esta acción no se puede deshacer.`)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('cajas').delete().eq('id', caja.id);
    refetchCajas();
  };

  const onGuardado = () => { setModal(null); refetchCajas(); };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B.green }} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Gestión de Cajas"
        subtitle="Administra el estado y operaciones de las cajas del sistema"
        action={<Btn onClick={() => setModal({ tipo: 'nueva' })}><Plus className="w-4 h-4" />Nueva Caja</Btn>} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total en Cajas" value={`S/ ${totalEnCajas.toFixed(2)}`} icon={DollarSign}  color={B.green} />
        <KpiCard label="Total Cajas"    value={cajas.length}                    icon={CreditCard}  color={B.gold}  />
        <KpiCard label="Abiertas"       value={abiertas}                        icon={CheckCircle} color={B.green} />
        <KpiCard label="Cerradas"       value={cerradas}                        icon={Lock}        color={B.terra} />
      </div>

      {cajas.length === 0 ? (
        <div className="text-center py-16" style={{ color: B.muted }}>
          <p className="text-sm">No hay cajas configuradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cajas.map(caja => (
            <CajaCard key={caja.id} caja={caja}
              onAbrir={c    => setModal({ tipo: 'apertura', caja: c })}
              onCerrar={c   => setModal({ tipo: 'cierre',   caja: c })}
              onReporte={c  => setModal({ tipo: 'reporte',  caja: c })}
              onEgreso={c   => setModal({ tipo: 'egreso',   caja: c })}
              onEditar={c   => setModal({ tipo: 'editar',   caja: c })}
              onEliminar={handleEliminar}
            />
          ))}
        </div>
      )}

      {modal?.tipo === 'apertura' && <ModalApertura  caja={modal.caja} onClose={() => setModal(null)} onSaved={onGuardado} />}
      {modal?.tipo === 'cierre'   && <ModalCierre    caja={modal.caja} onClose={() => setModal(null)} onSaved={onGuardado} />}
      {modal?.tipo === 'reporte'  && <ModalReporte   caja={modal.caja} onClose={() => setModal(null)} />}
      {modal?.tipo === 'egreso'   && <ModalEgreso    caja={modal.caja} onClose={() => setModal(null)} onSaved={onGuardado} />}
      {modal?.tipo === 'editar'   && (
        <ModalEditarCaja caja={modal.caja} onClose={() => setModal(null)} onSaved={onGuardado}
          usuarios={usuarios.map(u => ({ id: u.id, nombre: u.nombre }))} />
      )}
      {modal?.tipo === 'nueva' && (
        <ModalNuevaCaja onClose={() => setModal(null)} onSaved={onGuardado}
          usuarios={usuarios.map(u => ({ id: u.id, nombre: u.nombre }))} />
      )}
    </div>
  );
}
