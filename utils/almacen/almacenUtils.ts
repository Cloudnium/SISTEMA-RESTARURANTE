// utils/almacen/almacenUtils.ts
import type { CSSProperties } from 'react';
import { B } from '@/lib/brand';

export const INP: CSSProperties = {
  background: B.cream, border: `1px solid ${B.creamDark}`, color: B.charcoal,
};

export function inputCls(extra = '') {
  return `w-full px-3 py-2.5 rounded-xl text-sm outline-none ${extra}`;
}