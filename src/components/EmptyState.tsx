import React from 'react';

export default function EmptyState({ title, hint }: { title: string; hint?: string }){
  return (
    <div className="card">
      <div className="h2">{title}</div>
      {hint && <div className="muted">{hint}</div>}
    </div>
  );
}
