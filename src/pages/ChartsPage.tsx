import React, { useEffect, useMemo, useRef, useState } from "react";
import { parseSplLogText, type SplPoint } from "../services/splLog";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function withCacheBust(url: string) {
  return url.includes("?")
    ? `${url}&t=${Date.now()}`
    : `${url}?t=${Date.now()}`;
}

const LOG_URL = import.meta.env.DEV
  ? "/api/sensors-log"
  : "https://spl-log-proxy.starovierov98.workers.dev";

const PARAMS = [
  { key: "m1", label: "Влажность почвы (m1, резистивный)" },
  { key: "m2", label: "Влажность почвы (m2, емкостный)" },
  { key: "charge", label: "Заряд (В)" },
  { key: "aht_m", label: "Влажность воздуха (aht_m, %)" },
  { key: "aht_temp", label: "Температура наружная (aht_temp, °C)" },
  { key: "bmp_pressure", label: "Атмосферное давление (bmp_pressure, Па)" },
  { key: "temp", label: "Температура внутри устройства (temp, °C)" },
  { key: "bmp_temp", label: "Температура наружная (bmp_temp, °C)" },
  { key: "rain", label: "Датчик дождя" },
] as const;

type ParamKey = (typeof PARAMS)[number]["key"];

function timeLabel(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

function dateTimeLabel(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function ChartsPage() {
  const [points, setPoints] = useState<SplPoint[]>([]);
  const [sensorId, setSensorId] = useState<string>("");
  const [param, setParam] = useState<ParamKey>("m1");

  // старт "с нынешней даты и времени" = момент открытия страницы
  const sessionStartTs = useRef<number>(Date.now());
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const r = await fetch(withCacheBust(LOG_URL));
        if (!r.ok) return;

        const text = await r.text();
        const parsed = parseSplLogText(text);

        // только с момента открытия страницы
        const fresh = parsed.filter((p) => p.ts >= sessionStartTs.current);

        // только новые (по времени)
        const newOnes = fresh.filter((p) => p.ts > lastTsRef.current);
        if (!newOnes.length) return;

        lastTsRef.current = Math.max(...newOnes.map((p) => p.ts));
        if (!alive) return;

        setPoints((prev) => {
          const merged = [...prev, ...newOnes];
          // ограничим память (чтобы не разрасталось бесконечно)
          if (merged.length > 3000) return merged.slice(merged.length - 3000);
          return merged;
        });

        // если датчик ещё не выбран — выберем первый встретившийся
        if (!sensorId) setSensorId(newOnes[0].id);
      } catch {
        // молча
      }
    }

    tick();
    const id = window.setInterval(tick, 5000); // обновление раз в 5 сек
    return () => {
      alive = false;
      window.clearInterval(id);
    };
    // важно: не добавляем sensorId в зависимости, чтобы не пересоздавать таймер
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensorIds = useMemo(() => {
    return Array.from(new Set(points.map((p) => p.id))).sort();
  }, [points]);

  const series = useMemo(() => {
    const key = param;
    return points
      .filter((p) => p.id === sensorId)
      .map((p) => {
        const v = (p as any)[key] as number | undefined;
        return v == null ? null : { ts: p.ts, value: v };
      })
      .filter(Boolean) as { ts: number; value: number }[];
  }, [points, sensorId, param]);

  return (
    <div className="card">
      <div className="h1">Графики (real-time)</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Данные берутся из log.txt. График строится с момента открытия страницы.
      </div>

      <div
        className="row"
        style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}
      >
        <label className="row" style={{ gap: 8, alignItems: "center" }}>
          <span className="muted">Датчик (ID):</span>
          <select
            className="input"
            style={{ maxWidth: 200 }}
            value={sensorId}
            onChange={(e) => setSensorId(e.target.value)}
          >
            {sensorIds.length === 0 ? (
              <option value="">нет данных</option>
            ) : null}
            {sensorIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>

        <label className="row" style={{ gap: 8, alignItems: "center" }}>
          <span className="muted">Параметр:</span>
          <select
            className="input"
            style={{ maxWidth: 360 }}
            value={param}
            onChange={(e) => setParam(e.target.value as ParamKey)}
          >
            {PARAMS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="muted">Точек: {series.length}</div>
      </div>

      <div style={{ width: "100%", height: 360, marginTop: 12 }}>
        <ResponsiveContainer>
          <LineChart
            data={series}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="ts"
              type="number"
              domain={["auto", "auto"]}
              tickFormatter={(v) => timeLabel(Number(v))}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(v) => dateTimeLabel(Number(v))} />
            <Line type="monotone" dataKey="value" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {sensorId && series.length === 0 ? (
        <div className="muted" style={{ marginTop: 8 }}>
          По датчику {sensorId} пока нет значений для параметра "{param}" (с
          момента открытия страницы).
        </div>
      ) : null}
    </div>
  );
}
