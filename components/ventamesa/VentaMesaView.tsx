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

  // Al confirmar, la mesa pasa a 'ocupada' en la BD (lo hace TomaPedido vía
  // actualizarEstadoMesa). Reflejamos ese cambio también en el estado local
  // de `mesa` — si no, cuando el usuario le da "Otro pedido" y TomaPedido se
  // vuelve a montar, seguiría viendo el estado viejo ('disponible') y
  // pensaría que no hay pedido activo, intentando crear uno nuevo en una
  // mesa que ya tiene uno → choque de datos (409) contra la BD. Con esta
  // actualización, TomaPedido sabe que debe buscar el pedido existente y
  // sumarle items en vez de crear otro.
  const handleConfirmado = () => {
    setMesa(m => (m ? { ...m, estado: 'ocupada' } : m));
    setPaso('exito');
  };

  // "Volver a mesas" → limpia la mesa seleccionada y vuelve al selector.
  const handleVolverAMesas = () => {
    setMesa(null);
    setPaso('seleccionar');
  };

  // "Otro pedido" → se queda en la MISMA mesa y vuelve directo a la
  // pantalla de toma de pedido, sumando al pedido activo.
  const handleOtroPedido = () => {
    setPaso('pedido');
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
          onVolver={handleVolverAMesas}
          onConfirmado={handleConfirmado}
        />
      )}

      {paso === 'exito' && mesa && (
        <PantallaExito
          mesa={mesa}
          onNuevoPedido={handleOtroPedido}
          onVolver={handleVolverAMesas}
        />
      )}
    </div>
  );
}