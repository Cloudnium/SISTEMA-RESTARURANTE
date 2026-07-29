// utils/cocina/cocinaUtils.ts
import type { Pedido, PedidoItem } from '@/lib/supabase/types';
import {
  UMBRAL_ATENCION, UMBRAL_URGENTE, URGENCIA_CFG, type NivelUrgencia,
} from '@/constants/cocina/cocinaConstants';
import { corregirFechaBD } from '@/utils/mesas/useElapsedTime';

export interface TicketCocina {
  pedido:      Pedido;
  pendientes:  PedidoItem[];
  listos:      PedidoItem[];
  inicio:      string; // created_at más antiguo relevante para ordenar/mostrar espera
}

// Agrupa los pedidos activos en "tickets" de cocina: un ticket por mesa/pedido,
// ignorando items que ya se entregaron o cancelaron. Se ordenan del más
// antiguo al más nuevo para que la cocina atienda en orden de llegada.
//
// NOTA: `inicio` se guarda tal cual viene de la BD (con el offset de 5h que
// ya conoces). No hace falta corregirlo aquí porque el offset es constante
// para todos los registros, así que el orden relativo (localeCompare) no
// cambia. La corrección se aplica en el punto de uso, en `minutosDesde`.
export function construirTickets(pedidos: Pedido[]): TicketCocina[] {
  const tickets: TicketCocina[] = [];

  for (const pedido of pedidos) {
    const items       = pedido.items ?? [];
    const pendientes   = items.filter(i => i.estado === 'enviado_cocina');
    const listos        = items.filter(i => i.estado === 'listo');

    if (pendientes.length === 0 && listos.length === 0) continue;

    const referencia = pendientes.length > 0 ? pendientes : listos;
    const inicio = referencia.reduce(
      (min, i) => (i.created_at < min ? i.created_at : min),
      referencia[0].created_at,
    );

    tickets.push({ pedido, pendientes, listos, inicio });
  }

  return tickets.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

// FIX: `iso` viene con el mismo bug de offset de 5h que ya corregiste en
// utils/mesas/useElapsedTime.ts. Sin esto, el cálculo restaba contra una
// hora 5h más antigua de lo real, mostrando "300 min" en vez de los minutos
// reales de espera.
export function minutosDesde(iso: string, ahoraMs: number): number {
  const corregida = corregirFechaBD(iso);
  if (!corregida) return 0;
  return Math.max(0, Math.floor((ahoraMs - corregida.getTime()) / 60000));
}

export function urgenciaPorMinutos(minutos: number): NivelUrgencia {
  if (minutos < UMBRAL_ATENCION) return 'normal';
  if (minutos < UMBRAL_URGENTE)  return 'atencion';
  return 'urgente';
}

export function cfgUrgencia(minutos: number) {
  return URGENCIA_CFG[urgenciaPorMinutos(minutos)];
}