// components/comprobantes/ToastComprobante.tsx
'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { B } from '@/lib/brand';

export type ToastType = 'success' | 'error';

interface Props {
  msg:     string;
  type:    ToastType;
  onClose: () => void;
}

export function ToastComprobante({ msg, type, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold"
      style={{
        background: type === 'success' ? B.green : B.terra,
        color: '#fff',
        minWidth: 260,
      }}
    >
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertCircle  className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}