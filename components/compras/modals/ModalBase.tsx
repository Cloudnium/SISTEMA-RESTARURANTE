// components/compras/components/ModalBase.tsx
'use client';

import React from 'react';
import { X } from 'lucide-react';
import { B } from '@/lib/brand';

interface ModalBaseProps {
  title:    string;
  onClose:  () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function ModalBase({ title, onClose, children, actions }: ModalBaseProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,62,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
        style={{ background: B.white }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: B.cream }}
        >
          <h2 className="text-lg font-bold" style={{ color: B.charcoal }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: B.muted }}
            onMouseEnter={e => (e.currentTarget.style.background = B.cream)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {actions && (
          <div className="px-6 pb-6 flex gap-3 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}