// components/mesas/SelectorCliente.tsx
'use client';

import { useState, useMemo } from 'react';
import { Search, Users, UserCircle, UserPlus, X } from 'lucide-react';
import { B } from '@/lib/brand';
import { useGlobalData } from '@/context/GlobalDataContext';
import { getClienteGeneral, esClienteGeneral } from '@/constants/ventas/ventasConstants';
import type { Cliente, TipoComprobante } from '@/lib/supabase/types';

interface Props {
  clienteSeleccionado: Cliente | null;
  onSeleccionar: (c: Cliente | null) => void;
  tipoComprobante: TipoComprobante;
  onAbrirRegistro: () => void;
}

export default function SelectorCliente({
  clienteSeleccionado,
  onSeleccionar,
  tipoComprobante,
  onAbrirRegistro,
}: Props) {
  const [query,        setQuery]        = useState('');
  const [mostrarLista, setMostrarLista] = useState(false);

  const { clientes: todosClientes } = useGlobalData();

  // Cliente "General" real, buscado en la BD. null si todavía no carga o no existe.
  const generalReal = useMemo(() => getClienteGeneral(todosClientes), [todosClientes]);

  const resultados = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return todosClientes
      .filter(c =>
        c.nombre.toLowerCase().includes(lower) ||
        (c.dni ?? '').includes(lower) ||
        (c.ruc ?? '').includes(lower),
      )
      .slice(0, 8);
  }, [query, todosClientes]);

  const mostrarResultados = mostrarLista && query.trim().length > 0;

  const inp: React.CSSProperties = {
    background: B.cream,
    border: `1px solid ${B.creamDark}`,
    color: B.charcoal,
  };

  // ── Cliente ya seleccionado ──
  if (clienteSeleccionado) {
    const esGeneral = esClienteGeneral(clienteSeleccionado);
    return (
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: B.cream, border: `1px solid ${B.creamDark}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {esGeneral
            ? <UserCircle className="w-4 h-4 shrink-0" style={{ color: B.muted }} />
            : <Users      className="w-4 h-4 shrink-0" style={{ color: B.green }} />}
          <div className="min-w-0">
            <p
              className="text-sm font-bold truncate"
              style={{ color: esGeneral ? B.muted : B.charcoal }}
            >
              {clienteSeleccionado.nombre}
            </p>
            <p className="text-xs" style={{ color: B.muted }}>
              {clienteSeleccionado.ruc
                ? `RUC: ${clienteSeleccionado.ruc}`
                : clienteSeleccionado.dni
                  ? `DNI: ${clienteSeleccionado.dni}`
                  : 'Sin documento'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onSeleccionar(null)}
          className="p-1.5 rounded-lg shrink-0 ml-2"
          style={{ color: B.muted }}
          onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Cambiar cliente"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── Sin cliente: buscador + acciones rápidas ──
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: B.muted }}
        />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={
            tipoComprobante === 'factura'
              ? 'Buscar por nombre o RUC...'
              : 'Buscar por nombre o DNI...'
          }
          className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none"
          style={inp}
          onFocus={() => query.trim() && setMostrarLista(true)}
          onBlur={() => setTimeout(() => setMostrarLista(false), 150)}
        />

        {mostrarResultados && resultados.length > 0 && (
          <div
            className="absolute z-20 w-full mt-1 rounded-xl shadow-lg overflow-hidden"
            style={{ background: B.white, border: `1px solid ${B.creamDark}` }}
          >
            {resultados.map(c => (
              <button
                key={c.id}
                onMouseDown={() => { onSeleccionar(c); setQuery(''); setMostrarLista(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm"
                style={{ color: B.charcoal }}
                onMouseEnter={e => e.currentTarget.style.background = B.cream}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Users className="w-4 h-4 shrink-0" style={{ color: B.muted }} />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.nombre}</p>
                  <p className="text-[10px]" style={{ color: B.muted }}>
                    {c.ruc ? `RUC: ${c.ruc}` : c.dni ? `DNI: ${c.dni}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {mostrarResultados && resultados.length === 0 && (
          <div
            className="absolute z-20 w-full mt-1 rounded-xl px-4 py-3 text-sm"
            style={{ background: B.white, border: `1px solid ${B.creamDark}`, color: B.muted }}
          >
            Sin resultados para &ldquo;{query}&rdquo;
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-2">
        <button
          onClick={() => generalReal && onSeleccionar(generalReal)}
          disabled={!generalReal}
          title={!generalReal ? 'No se encontró "Cliente General" en la base de datos' : undefined}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}
          onMouseEnter={e => { if (generalReal) e.currentTarget.style.background = B.creamDark; }}
          onMouseLeave={e => e.currentTarget.style.background = B.cream}
        >
          <UserCircle className="w-3.5 h-3.5" /> Cliente General
        </button>
        <button
          onClick={onAbrirRegistro}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl flex-1 justify-center"
          style={{ background: B.cream, color: B.charcoal, border: `1px solid ${B.creamDark}` }}
          onMouseEnter={e => e.currentTarget.style.background = B.creamDark}
          onMouseLeave={e => e.currentTarget.style.background = B.cream}
        >
          <UserPlus className="w-3.5 h-3.5" /> Nuevo cliente
        </button>
      </div>

      {!generalReal && (
        <p className="text-[11px] px-1" style={{ color: B.terra }}>
          ⚠️ &ldquo;Cliente General&rdquo; no está disponible aún (cargando datos o no existe en la BD).
        </p>
      )}
    </div>
  );
}