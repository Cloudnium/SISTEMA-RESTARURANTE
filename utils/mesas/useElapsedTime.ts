'use client';

import { useEffect, useState } from 'react';

// ── Corrección de un bug conocido en la base de datos ──────────────────────
// Columnas como pedidos.created_at usan como default
// `now() AT TIME ZONE 'America/Lima'`. Ese AT TIME ZONE sobre un timestamptz
// devuelve la hora de pared en Lima SIN zona horaria; al guardarse en una
// columna timestamptz, Postgres la reinterpreta con la zona horaria de la
// sesión (UTC en el pooler de Supabase), restando 5 horas de más. Todo lo
// que se guarda con ese default queda 5 horas "atrasado" respecto al
// instante real. Mientras no se corrija el default en la base de datos,
// compensamos acá sumando esas 5 horas de vuelta.
const OFFSET_BUG_BD_MS = 5 * 60 * 60 * 1000;

export function corregirFechaBD(fechaIso: string | null | undefined): Date | null {
  if (!fechaIso) return null;
  const t = new Date(fechaIso).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + OFFSET_BUG_BD_MS);
}

/**
 * Minutos transcurridos desde `startIso` (una columna afectada por el bug de
 * arriba), recalculados en el cliente.
 */
export function useElapsedMinutes(startIso: string | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const inicio = corregirFechaBD(startIso);
  if (!inicio) return null;
  return Math.max(0, Math.floor((now - inicio.getTime()) / 60000));
}

/** Formatea minutos como "45 min" o "1h 12min" */
export function fmtDuracion(minutos: number | null): string | null {
  if (minutos == null) return null;
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h ${m.toString().padStart(2, '0')}min`;
}