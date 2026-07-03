// components/ventamesa/VentaMesaView.tsx
'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui';
import { SelectorMesa }  from '@/components/ventamesa/SelectorMesa';
import { TomaPedido }    from '@/components/ventamesa/TomaPedido';
import { PantallaExito } from '@/components/ventamesa/PantallaExito';
import { useAuth }       from '@/lib/auth/AuthContext';
import { useGlobalData } from '@/context/GlobalDataContext';
import type { MesaRow }  from '@/utils/venta-mesa/ventaMesaUtils';

type Paso = 'seleccionar' | 'pedido' | 'exito';

export default function VentaMesaView() {
  const [paso, setPaso] = useState<Paso>('seleccionar');
  const [mesa, setMesa] = useState<MesaRow | null>(null);

  const { usuario }  = useAuth();
  const { cajas }    = useGlobalData();

  const cajaAbierta = useMemo(() => {
    if (!usuario?.caja_id) return false;
    const caja = cajas.find(c => c.id === usuario.caja_id);
    return caja?.estado === 'abierta';
  }, [cajas, usuario]);

  const handleSeleccionarMesa = (m: MesaRow) => {
    setMesa(m);
    setPaso('pedido');
  };

  const handleConfirmado = () => setPaso('exito');

  const handleNuevoPedido = () => {
    setMesa(null);
    setPaso('seleccionar');
  };

  const subtitulo =
    paso === 'seleccionar'
      ? 'Selecciona una mesa para tomar el pedido'
      : paso === 'pedido' && mesa
      ? `Tomando pedido — ${mesa.nombre ?? `Mesa ${mesa.numero}`} · ${mesa.zona}`
      : 'Pedido confirmado';

  return (
    <div>
      <PageHeader title="Venta Mesa" subtitle={subtitulo} />

      {paso === 'seleccionar' && (
        <SelectorMesa onSelect={handleSeleccionarMesa} />
      )}

      {paso === 'pedido' && mesa && (
        <TomaPedido
          mesa={mesa}
          cajaAbierta={cajaAbierta}
          onVolver={() => { setMesa(null); setPaso('seleccionar'); }}
          onConfirmado={handleConfirmado}
        />
      )}

      {paso === 'exito' && mesa && (
        <PantallaExito
          mesa={mesa}
          onNuevoPedido={handleNuevoPedido}
          onVolver={handleNuevoPedido}
        />
      )}
    </div>
  );
}