//components/shared/Placeholderview.tsx
'use client';

import React from 'react';
import { Package } from 'lucide-react';
import { B } from '@/lib/brand';

interface PlaceholderViewProps {
  label: string;
}

export default function PlaceholderView({ label }: PlaceholderViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: `${B.green}18` }}
      >
        <Package className="w-8 h-8" style={{ color: B.green }} />
      </div>
      <h2 className="text-xl font-bold" style={{ color: B.charcoal }}>{label}</h2>
      <p className="text-sm mt-2" style={{ color: B.muted }}>Este módulo está en desarrollo</p>
    </div>
  );
}