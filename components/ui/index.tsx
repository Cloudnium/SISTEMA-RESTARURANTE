//components/ui/index.tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { B } from '@/lib/brand';

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
export function Card({ children, className = '', style }: CardProps) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: B.white, border: `1px solid ${B.cream}`, ...style }}
    >
      {children}
    </div>
  );
}

// ─── Btn ──────────────────────────────────────────────────────────────────────
interface BtnProps {
  children: React.ReactNode;
  color?: string;
  textColor?: string;
  small?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}
export function Btn({
  children,
  color = B.charcoal,
  textColor = B.cream,
  small = false,
  onClick,
  disabled = false,
}: BtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-xl font-bold transition-opacity ${
        small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ background: color, color: textColor }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = '0.88'; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.opacity = '1'; }}
    >
      {children}
    </button>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: B.charcoal }}>{title}</h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: B.muted }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color: string;
  trend?: number;
}
export function KpiCard({ label, value, sub, icon: Icon, color, trend }: KpiCardProps) {
  const up = trend !== undefined && trend >= 0;
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: B.muted }}>
            {label}
          </p>
          <p className="text-2xl font-bold mt-0.5" style={{ color: B.charcoal }}>{value}</p>
          {sub && <p className="text-xs mt-0.5" style={{ color: B.muted }}>{sub}</p>}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}18` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1">
          {up
            ? <ArrowUpRight className="w-3.5 h-3.5" style={{ color: B.green }} />
            : <ArrowDownRight className="w-3.5 h-3.5" style={{ color: B.terra }} />
          }
          <span className="text-xs font-semibold" style={{ color: up ? B.green : B.terra }}>
            {Math.abs(trend)}% vs ayer
          </span>
        </div>
      )}
    </Card>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────
interface SectionTitleProps {
  children: React.ReactNode;
  sub?: string;
}
export function SectionTitle({ children, sub }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="w-1 h-4 rounded-full shrink-0" style={{ background: B.gold }} />
      <p className="text-sm font-bold" style={{ color: B.charcoal }}>{children}</p>
      {sub && <span className="text-xs" style={{ color: B.muted }}>· {sub}</span>}
    </div>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
interface ProgressBarProps {
  pct: number;       // 0–100
  color?: string;
  height?: number;
}
export function ProgressBar({ pct, color = B.green, height = 6 }: ProgressBarProps) {
  return (
    <div
      className="rounded-full overflow-hidden w-full"
      style={{ background: B.cream, height }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  );
}