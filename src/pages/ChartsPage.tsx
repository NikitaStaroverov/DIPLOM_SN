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
  ReferenceArea,
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

function windowMs(key: "6h" | "24h" | "7d" | "all") {
  switch (key) {
    case "6h":
      return 6 * 60 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "all":
      return Infinity;
  }
}

export default function ChartsPage() {
  const [points, setPoints] = useState<SplPoint[]>([]);
  const [sensorId, setSensorId] = useState<string>("");
  const [param, setParam] = useState<ParamKey>("m1");
  const [status, setStatus] = useState<string>("Загрузка лога…");
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);

  // состояния зума
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);

  function handleMouseDown(e: any) {
    if (e && typeof e.activeLabel === "number") {
      setRefAreaLeft(e.activeLabel);
      setRefAreaRight(e.activeLabel);
    }
  }

  function handleMouseMove(e: any) {
    if (refAreaLeft !== null && e && typeof e.activeLabel === "number") {
      setRefAreaRight(e.activeLabel);
    }
  }

  function handleMouseUp() {
    if (refAreaLeft === null || refAreaRight === null) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    if (refAreaLeft === refAreaRight) {
      // клик без выделения
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    const [from, to] =
      refAreaLeft < refAreaRight
        ? [refAreaLeft, refAreaRight]
        : [refAreaRight, refAreaLeft];

    setZoomDomain([from, to]);

    setRefAreaLeft(null);
    setRefAreaRight(null);
  }

  function resetZoom() {
    setZoomDomain(null);
  }

  const [windowKey, setWindowKey] = useState<"6h" | "24h" | "7d" | "all">(
    "24h",
  );

  // старт "с нынешней даты и времени" = момент открытия страницы
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    let alive = true;

    lastTsRef.current = 0;
    setPoints([]);
    setStatus("Загрузка лога…");

    async function tick() {
      try {
        const r = await fetch(withCacheBust(LOG_URL));
        if (!r.ok) return;

        const text = await r.text();
        const parsed = parseSplLogText(text);

        const startTs =
          windowKey === "all" ? -Infinity : Date.now() - windowMs(windowKey);

        const fresh = parsed.filter((p) => p.ts >= startTs);
        setLastFetchAt(Date.now());

        // Первая загрузка
        if (lastTsRef.current === 0) {
          setPoints(fresh.slice(-3000));
          lastTsRef.current = fresh.length
            ? Math.max(...fresh.map((p) => p.ts))
            : 0;

          setStatus(
            fresh.length
              ? "История загружена. Онлайн обновление…"
              : "Лог пустой. Ждём данные…",
          );

          if (!sensorId && fresh.length) {
            setSensorId(fresh[fresh.length - 1].id);
          }

          return;
        }

        // Онлайн обновление
        const newOnes = fresh.filter((p) => p.ts > lastTsRef.current);

        if (!newOnes.length) {
          setStatus("Онлайн: новых данных пока нет…");
          return;
        }

        lastTsRef.current = Math.max(...newOnes.map((p) => p.ts));

        if (!alive) return;

        setPoints((prev) => {
          const merged = [...prev, ...newOnes];
          return merged.slice(-3000);
        });

        setStatus(`Онлайн: +${newOnes.length} новых точек`);
      } catch {
        setStatus("Ошибка загрузки");
      }
    }

    tick();
    const id = window.setInterval(tick, 5000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [windowKey]);

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
        Данные берутся из log.txt. График строится за выбранный период.
      </div>

      <div
        className="row"
        style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}
      >
        <label
          className="row"
          style={{ gap: 8, alignItems: "center", flexWrap: "nowrap" }}
        >
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

      <label
        className="row"
        style={{ gap: 8, alignItems: "center", marginTop: "10px" }}
      >
        <span className="muted">Период:</span>
        <select
          className="input"
          style={{ maxWidth: 200 }}
          value={windowKey}
          onChange={(e) => setWindowKey(e.target.value as any)}
        >
          <option value="6h">6 часов</option>
          <option value="24h">24 часа</option>
          <option value="7d">7 дней</option>
          <option value="all">Всё</option>
        </select>
      </label>

      {zoomDomain && (
        <button
          onClick={resetZoom}
          style={{
            marginTop: 12,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          Сбросить зум
        </button>
      )}
      <div
        style={{
          width: "100%",
          height: 360,
          marginTop: 12,
          userSelect: "none",
        }}
      >
        <ResponsiveContainer>
          <LineChart
            data={series}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="ts"
              type="number"
              allowDataOverflow
              domain={zoomDomain ?? ["auto", "auto"]}
              tickFormatter={(v) => timeLabel(Number(v))}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(v) => dateTimeLabel(Number(v))} />
            {refAreaLeft !== null && refAreaRight !== null ? (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                fillOpacity={0.15}
              />
            ) : null}
            <Line type="monotone" dataKey="value" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {sensorId && series.length === 0 ? (
        <div className="muted" style={{ marginTop: 8, textAlign: "center" }}>
          По датчику {sensorId} пока нет значений для параметра "{param}" (с
          момента открытия страницы).
        </div>
      ) : null}
    </div>
  );
}
