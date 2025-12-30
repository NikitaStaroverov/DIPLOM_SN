import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';

export default function LoginPage(){
  const login = useAppStore(s => s.login);
  const resetToDefault = useAppStore(s => s.resetToDefault);
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from ?? '/';

  const [u, setU] = useState('admin');
  const [p, setP] = useState('admin');
  const [err, setErr] = useState<string | null>(null);


  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="card">
        <div className="h1">Авторизация</div>
        <div style={{ height: 14 }} />
        <label className="muted">Логин</label>
        <input className="input" value={u} onChange={e => setU(e.target.value)} placeholder="admin" />
        <div style={{ height: 10 }} />
        <label className="muted">Пароль</label>
        <input className="input" value={p} onChange={e => setP(e.target.value)} placeholder="••••••" type="password" />
        {err && <div style={{ marginTop: 10, color: 'var(--bad)' }}>{err}</div>}
        <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
          <button className="btn" type="button" onClick={() => { resetToDefault(); setErr(null); setU('admin'); setP('admin'); }}>
            Сбросить к admin/admin
          </button>
          <button
            className="btn btnPrimary"
            type="button"
            onClick={() => {
              const ok = login(u.trim(), p);
              if (!ok) return setErr('Неверный логин или пароль');
              navigate(from, { replace: true });
            }}
          >
            Войти
          </button>
        </div>
      </div>
    </div>
  );
}
