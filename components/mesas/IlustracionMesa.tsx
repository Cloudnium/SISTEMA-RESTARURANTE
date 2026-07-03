// components/mesas/IlustracionMesa.tsx
import Image from 'next/image';
import type { EstadoMesa } from '@/lib/supabase/types';
import { ICONOS, COLOR_FILTERS } from '@/constants/mesas/mesasConstants';

interface Props {
  estado: EstadoMesa;
}

export default function IlustracionMesa({ estado }: Props) {
  return (
    <Image
      src={ICONOS[estado]}
      alt=""
      width={65}
      height={65}
      aria-hidden="true"
      className="w-full h-full object-contain"
      style={{ filter: COLOR_FILTERS[estado] }}
    />
  );
}