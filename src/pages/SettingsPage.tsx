import React, { useMemo, useState } from "react";
import { useAppStore } from "../store";
import type { Field, Thresholds } from "../types";

export default function SettingsPage() {
  const fields = useAppStore((s) => s.fields);
  const thresholds = useAppStore((s) => s.thresholds);
  const setThresholds = useAppStore((s) => s.setThresholds);
  const setFields = useAppStore((s) => s.setFields);
  const setCredentials = useAppStore((s) => s.setCredentials);
  const reload = useAppStore((s) => s.reloadFromStorage);

  const [t, setT] = useState<Thresholds>(thresholds);
  const [f, setF] = useState<Field[]>(fields);
  const [u, setU] = useState<string>("admin");
  const [p, setP] = useState<string>("admin");

  const changed = useMemo(
    () =>
      JSON.stringify(t) !== JSON.stringify(thresholds) ||
      JSON.stringify(f) !== JSON.stringify(fields),
    [t, thresholds, f, fields],
  );

  return (
    <div className="grid2">
      <div className="card">
        <div className="h1">Настройки</div>

        <div className="h2">Уставки</div>

        <div className="card">
          <div className="muted" style={{ marginBottom: 8 }}>
            Температура (°C)
          </div>
          <div className="row">
            <label style={{ flex: 1 }} className="muted">
              warnMin
              <input
                className="input"
                type="number"
                value={t.temperature.warnMin}
                onChange={(e) =>
                  setT({
                    ...t,
                    temperature: {
                      ...t.temperature,
                      warnMin: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label style={{ flex: 1 }} className="muted">
              warnMax
              <input
                className="input"
                type="number"
                value={t.temperature.warnMax}
                onChange={(e) =>
                  setT({
                    ...t,
                    temperature: {
                      ...t.temperature,
                      warnMax: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label style={{ flex: 1 }} className="muted">
              dangerMax
              <input
                className="input"
                type="number"
                value={t.temperature.dangerMax}
                onChange={(e) =>
                  setT({
                    ...t,
                    temperature: {
                      ...t.temperature,
                      dangerMax: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
        </div>

        <div style={{ height: 10 }} />

        <div className="card">
          <div className="muted" style={{ marginBottom: 8 }}>
            Влажность (%)
          </div>
          <div className="row">
            <label style={{ flex: 1 }} className="muted">
              warnMin
              <input
                className="input"
                type="number"
                value={t.wetness.warnMin}
                onChange={(e) =>
                  setT({
                    ...t,
                    wetness: { ...t.wetness, warnMin: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label style={{ flex: 1 }} className="muted">
              warnMax
              <input
                className="input"
                type="number"
                value={t.wetness.warnMax}
                onChange={(e) =>
                  setT({
                    ...t,
                    wetness: { ...t.wetness, warnMax: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label style={{ flex: 1 }} className="muted">
              dangerMin
              <input
                className="input"
                type="number"
                value={t.wetness.dangerMin}
                onChange={(e) =>
                  setT({
                    ...t,
                    wetness: {
                      ...t.wetness,
                      dangerMin: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
        </div>

        <div style={{ height: 10 }} />

        <div className="card">
          <div className="muted" style={{ marginBottom: 8 }}>
            Заряд батареи (%)
          </div>
          <div className="row">
            <label style={{ flex: 1 }} className="muted">
              warnMin
              <input
                className="input"
                type="number"
                value={t.charge.warnMin}
                onChange={(e) =>
                  setT({
                    ...t,
                    charge: { ...t.charge, warnMin: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label style={{ flex: 1 }} className="muted">
              warnMax
              <input
                className="input"
                type="number"
                value={t.charge.warnMax}
                onChange={(e) =>
                  setT({
                    ...t,
                    charge: { ...t.charge, warnMax: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label style={{ flex: 1 }} className="muted">
              dangerMin
              <input
                className="input"
                type="number"
                value={t.charge.dangerMin}
                onChange={(e) =>
                  setT({
                    ...t,
                    charge: { ...t.charge, dangerMin: Number(e.target.value) },
                  })
                }
              />
            </label>
          </div>
        </div>

        <div
          className="row"
          style={{ marginTop: 12, justifyContent: "space-between" }}
        >
          <button
            className="btn"
            onClick={() => {
              reload();
              setT(thresholds);
              setF(fields);
            }}
          >
            Отменить
          </button>
          <button
            className="btn btnPrimary"
            disabled={!changed}
            onClick={() => {
              setThresholds(t);
              setFields(f);
            }}
          >
            Сохранить
          </button>
        </div>
      </div>

      <div className="card">
        <div className="h2">Координаты полей</div>
        <div className="muted" style={{ marginBottom: 10 }}>
          Эти координаты используются на странице API (погода) и могут
          понадобиться для логики «не поливать если дождь».
        </div>

        <div className="card" style={{ padding: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Поле</th>
                <th>lat</th>
                <th>lon</th>
                <th>Датчики</th>
              </tr>
            </thead>
            <tbody>
              {f.map((field, idx) => (
                <tr key={field.id}>
                  <td className="muted">{field.name}</td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      value={field.coords.lat}
                      onChange={(e) => {
                        const next = [...f];
                        next[idx] = {
                          ...field,
                          coords: {
                            ...field.coords,
                            lat: Number(e.target.value),
                          },
                        };
                        setF(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      value={field.coords.lon}
                      onChange={(e) => {
                        const next = [...f];
                        next[idx] = {
                          ...field,
                          coords: {
                            ...field.coords,
                            lon: Number(e.target.value),
                          },
                        };
                        setF(next);
                      }}
                    />
                  </td>
                  <td className="muted">{field.sensors.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ height: 16 }} />

        <div className="h2">Логин/пароль</div>

        <label className="muted">Новый логин</label>
        <input
          className="input"
          value={u}
          onChange={(e) => setU(e.target.value)}
        />
        <div style={{ height: 10 }} />
        <label className="muted">Новый пароль</label>
        <input
          className="input"
          value={p}
          onChange={(e) => setP(e.target.value)}
          type="password"
        />
        <div style={{ height: 12 }} />
        <button
          className="btn btnPrimary"
          onClick={() => setCredentials(u.trim() || "admin", p || "admin")}
        >
          Применить учетные данные
        </button>
      </div>
    </div>
  );
}
