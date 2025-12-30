import React from 'react';
import type { Status } from '../types';

export default function StatusBadge({ status, label }: { status: Status; label: string }) {
  const color =
    status === 'good' ? 'var(--good)' :
    status === 'warn' ? 'var(--warn)' : 'var(--bad)';
  return (
    <span className="badge" title={label}>
      <span className="dot" style={{ background: color }} />
      {label}
    </span>
  );
}
