// utils/cocina/cocinaUtils.ts
import type { Pedido, PedidoItem } from '@/lib/supabase/types';
import {
  UMBRAL_ATENCION, UMBRAL_URGENTE, URGENCIA_CFG, type NivelUrgencia,
} from '@/constants/cocina/cocinaConstants';

export interface TicketCocina {
  pedido:      Pedido;
  pendientes:  PedidoItem[];
  listos:      PedidoItem[];
  inicio:      string; // created_at más antiguo relevante para ordenar/mostrar espera
}

// Agrupa los pedidos activos en "tickets" de cocina: un ticket por mesa/pedido,
// ignorando items que ya se entregaron o cancelaron. Se ordenan del más
// antiguo al más nuevo para que la cocina atienda en orden de llegada.
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

export function minutosDesde(iso: string, ahoraMs: number): number {
  return Math.max(0, Math.floor((ahoraMs - new Date(iso).getTime()) / 60000));
}

export function urgenciaPorMinutos(minutos: number): NivelUrgencia {
  if (minutos < UMBRAL_ATENCION) return 'normal';
  if (minutos < UMBRAL_URGENTE)  return 'atencion';
  return 'urgente';
}

export function cfgUrgencia(minutos: number) {
  return URGENCIA_CFG[urgenciaPorMinutos(minutos)];
}