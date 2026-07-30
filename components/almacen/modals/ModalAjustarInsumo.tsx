// components/almacen/modals/ModalAjustarInsumo.tsx
'use client';

import { useState } from 'react';
import { X, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { B } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import { ajustarStockInsumo } from '@/lib/supabase/queries';
import { INP } from '@/utils/almacen/almacenUtils';
import type { Producto } from '@/lib/supabase/types';

// Nota: no se conecta a ventas/zonas, solo al stock de cocina del insumo.
interface Props {
  producto: Producto;
  onClose: () => void;
  onSaved: () => void;
}

export default function ModalAjustarInsumo({ producto, onClose, onSaved }: Props) {
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