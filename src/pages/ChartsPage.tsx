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
type ChartPoint = { ts: number; value: number };

const ALL_MIN_POINTS = 1200;
const ALL_MAX_POINTS = 4000;

function adaptiveAllPointLimit(totalPoints: number) {
  if (totalPoints <= ALL_MIN_POINTS) return totalPoints;
  const adaptive = Math.round(900 + Math.log2(totalPoints) * 180);
  return Math.max(ALL_MIN_POINTS, Math.min(ALL_MAX_POINTS, adaptive));
}

function normalizeSeriesByTimestamp(data: ChartPoint[]): ChartPoint[] {
  if (data.length <= 1) return data;

  const sorted = [...data].sort((a, b) => a.ts - b.ts);
  const normalized: ChartPoint[] = [];

  let ts = sorted[0].ts;
  let sum = sorted[0].value;
  let count = 1;

  for (let i = 1; i < sorted.length; i++) {
    const p = sorted[i];
    if (p.ts === ts) {
      sum += p.value;
      count += 1;
      continue;
    }

    normalized.push({ ts, value: sum / count });
    ts = p.ts;
    sum = p.value;
    count = 1;
  }

  normalized.push({ ts, value: sum / count });
  return normalized;
}

function downsampleAveragedSeries(data: ChartPoint[], maxPoints: number): ChartPoint[] {
  if (data.length <= maxPoints || maxPoints < 3) return data;

  const bucketSize = Math.ceil(data.length / maxPoints);
  const reduced: ChartPoint[] = [];

  for (let i = 0; i < data.length; i += bucketSize) {
    const end = Math.min(i + bucketSize, data.length);
    let sumTs = 0;
    let sumValue = 0;
    let count = 0;

    for (let j = i; j < end; j++) {
      sumTs += data[j].ts;
      sumValue += data[j].value;
      count += 1;
    }

    reduced.push({
      ts: Math.round(sumTs / count),
      value: sumValue / count,
    });
  }

  if (reduced.length >= 2) {
    reduced[0] = data[0];
    reduced[reduced.length - 1] = data[data.length - 1];
  }

  return reduced;
}

function smoothSeries(data: ChartPoint[], windowSize: number): ChartPoint[] {
  if (windowSize <= 1 || data.length <= 2) return data;

  const size = windowSize % 2 === 0 ? windowSize + 1 : windowSize;
  const radius = Math.floor(size / 2);
  const prefix = new Array<number>(data.length + 1).fill(0);

  for (let i = 0; i < data.length; i++) {
    prefix[i + 1] = prefix[i] + data[i].value;
  }

  return data.map((p, i) => {
    const from = Math.max(0, i - radius);
    const to = Math.min(data.length - 1, i + radius);
    const sum = prefix[to + 1] - prefix[from];
    const avg = sum / (to - from + 1);
    return { ts: p.ts, value: avg };
  });
}

function clampDomainToBounds(
  domain: [number, number],
  bounds: [number, number],
): [number, number] {
  const [minTs, maxTs] = bounds;
  const [from, to] = domain;
  const width = to - from;
  const range = maxTs - minTs;

  if (!Number.isFinite(width) || width <= 0) return [minTs, maxTs];
  if (!Number.isFinite(range) || range <= 0 || width >= range) {
    return [minTs, maxTs];
  }

  let nextFrom = from;
  let nextTo = to;

  if (nextFrom < minTs) {
    nextFrom = minTs;
    nextTo = minTs + width;
  }

  if (nextTo > maxTs) {
    nextTo = maxTs;
    nextFrom = maxTs - width;
  }

  return [nextFrom, nextTo];
}

function timeLabel(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function dateTimeLabel(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function intTick(v: number) {
  return String(Math.trunc(v));
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
  const [isPanning, setIsPanning] = useState(false);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const panRafRef = useRef<number | null>(null);
  const panQueuedDomainRef = useRef<[number, number] | null>(null);
  const panStartRef = useRef<{
    label: number;
    chartX: number | null;
    domain: [number, number];
  } | null>(null);

  function handleMouseDown(state: any, evt?: any) {
    if (!state || typeof state.activeLabel !== "number") return;

    const activeLabel = state.activeLabel as number;
    const shiftPressed = Boolean(evt?.shiftKey ?? evt?.nativeEvent?.shiftKey);

    if (zoomDomain && !shiftPressed) {
      panStartRef.current = {
        label: activeLabel,
        chartX: typeof state.chartX === "number" ? state.chartX : null,
        domain: zoomDomain,
      };
      setIsPanning(true);
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    panStartRef.current = null;
    setIsPanning(false);
    setRefAreaLeft(activeLabel);
    setRefAreaRight(activeLabel);
  }

  function queuePanDomain(domain: [number, number]) {
    panQueuedDomainRef.current = domain;

    if (panRafRef.current !== null) return;

    panRafRef.current = window.requestAnimationFrame(() => {
      panRafRef.current = null;
      const queued = panQueuedDomainRef.current;
      panQueuedDomainRef.current = null;
      if (!queued) return;

      setZoomDomain((prev) => {
        if (prev && prev[0] === queued[0] && prev[1] === queued[1]) {
          return prev;
        }
        return queued;
      });
    });
  }

  function flushQueuedPanDomain() {
    if (panRafRef.current !== null) {
      window.cancelAnimationFrame(panRafRef.current);
      panRafRef.current = null;
    }

    const queued = panQueuedDomainRef.current;
    panQueuedDomainRef.current = null;
    if (queued) {
      setZoomDomain(queued);
    }
  }

  function handleMouseMove(state: any) {
    if (!state || typeof state.activeLabel !== "number") return;

    if (isPanning) {
      if (!panStartRef.current || !seriesBounds) return;
      const domainWidth =
        panStartRef.current.domain[1] - panStartRef.current.domain[0];

      let shiftMs: number;
      if (
        panStartRef.current.chartX !== null &&
        typeof state.chartX === "number" &&
        chartWrapRef.current &&
        chartWrapRef.current.clientWidth > 0
      ) {
        const dx = state.chartX - panStartRef.current.chartX;
        shiftMs = -(dx / chartWrapRef.current.clientWidth) * domainWidth;
      } else {
        const delta = state.activeLabel - panStartRef.current.label;
        shiftMs = delta;
      }

      const nextDomain: [number, number] = [
        panStartRef.current.domain[0] + shiftMs,
        panStartRef.current.domain[1] + shiftMs,
      ];
      queuePanDomain(clampDomainToBounds(nextDomain, seriesBounds));
      return;
    }

    if (refAreaLeft !== null) {
      setRefAreaRight(state.activeLabel);
    }
  }

  function handleMouseUp() {
    if (isPanning) {
      flushQueuedPanDomain();
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }

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

  function shiftZoomWindow(direction: -1 | 1) {
    if (!zoomDomain || !seriesBounds) return;

    const width = zoomDomain[1] - zoomDomain[0];
    const shiftMs = Math.max(width * 0.25, 1000) * direction;
    const shifted: [number, number] = [
      zoomDomain[0] + shiftMs,
      zoomDomain[1] + shiftMs,
    ];

    setZoomDomain(clampDomainToBounds(shifted, seriesBounds));
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

    setZoomDomain(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);

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
        if (!alive) return;

        // Первая загрузка
        if (lastTsRef.current === 0) {
          setPoints(fresh);
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
        setPoints(fresh);

        const newOnes = fresh.filter((p) => p.ts > lastTsRef.current);

        if (!newOnes.length) {
          setStatus("Онлайн: новых данных пока нет…");
          return;
        }

        lastTsRef.current = Math.max(...newOnes.map((p) => p.ts));

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

  const rawSeries = useMemo(() => {
    const key = param;
    const mapped = points
      .filter((p) => p.id === sensorId)
      .map((p) => {
        const v = (p as any)[key] as number | undefined;
        return v == null ? null : { ts: p.ts, value: v };
      })
      .filter(Boolean) as ChartPoint[];
    return normalizeSeriesByTimestamp(mapped);
  }, [points, sensorId, param]);

  const series = useMemo(() => {
    if (windowKey !== "all") return rawSeries;
    return downsampleAveragedSeries(
      rawSeries,
      adaptiveAllPointLimit(rawSeries.length),
    );
  }, [rawSeries, windowKey]);

  const displaySeries = useMemo(() => {
    const window =
      series.length > 3000
        ? 11
        : series.length > 1200
          ? 7
          : series.length > 300
            ? 5
            : 3;
    return smoothSeries(series, window);
  }, [series]);

  const visibleSeries = useMemo(() => {
    if (!zoomDomain) return displaySeries;
    const filtered = displaySeries.filter(
      (p) => p.ts >= zoomDomain[0] && p.ts <= zoomDomain[1],
    );
    return filtered.length ? filtered : displaySeries;
  }, [displaySeries, zoomDomain]);

  const yDomain = useMemo<[number, number] | ["auto", "auto"]>(() => {
    if (!visibleSeries.length) return ["auto", "auto"];

    let min = visibleSeries[0].value;
    let max = visibleSeries[0].value;

    for (let i = 1; i < visibleSeries.length; i++) {
      const v = visibleSeries[i].value;
      if (v < min) min = v;
      if (v > max) max = v;
    }

    const spread = max - min;
    const mid = (min + max) / 2;
    const half = spread > 0 ? spread * 0.75 : Math.max(Math.abs(mid) * 0.05, 1);
    const from = Math.floor(mid - half);
    const to = Math.ceil(mid + half);

    if (to - from < 2) {
      const c = Math.round(mid);
      return [c - 1, c + 1];
    }

    return [from, to];
  }, [visibleSeries]);

  const seriesBounds = useMemo<[number, number] | null>(() => {
    if (!series.length) return null;

    let minTs = series[0].ts;
    let maxTs = series[0].ts;

    for (let i = 1; i < series.length; i++) {
      const ts = series[i].ts;
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;
    }

    return [minTs, maxTs];
  }, [series]);

  useEffect(() => {
    if (!zoomDomain) return;

    if (!seriesBounds) {
      setZoomDomain(null);
      return;
    }

    const clamped = clampDomainToBounds(zoomDomain, seriesBounds);
    if (clamped[0] !== zoomDomain[0] || clamped[1] !== zoomDomain[1]) {
      setZoomDomain(clamped);
    }
  }, [zoomDomain, seriesBounds]);

  useEffect(() => {
    return () => {
      if (panRafRef.current !== null) {
        window.cancelAnimationFrame(panRafRef.current);
      }
    };
  }, []);

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

        <div className="muted">
          Точек: {series.length}
          {windowKey === "all" && rawSeries.length > series.length
            ? ` (из ${rawSeries.length})`
            : ""}
        </div>
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
      <div className="muted" style={{ marginTop: 8 }}>
        Зум: выделите участок мышью. Перемещение: перетаскивайте график.
        Shift + перетаскивание при активном зуме: новый зум.
      </div>

      {zoomDomain && (
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => shiftZoomWindow(-1)}
            style={{ padding: "6px 12px", cursor: "pointer" }}
          >
            ← Влево
          </button>
          <button
            onClick={() => shiftZoomWindow(1)}
            style={{ padding: "6px 12px", cursor: "pointer" }}
          >
            Вправо →
          </button>
          <button
            onClick={resetZoom}
            style={{ padding: "6px 12px", cursor: "pointer" }}
          >
            Сбросить зум
          </button>
        </div>
      )}
      <div
        ref={chartWrapRef}
        style={{
          width: "100%",
          height: 360,
          marginTop: 12,
          userSelect: "none",
        }}
      >
        <ResponsiveContainer>
          <LineChart
            data={displaySeries}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="ts"
              type="number"
              allowDataOverflow
              domain={zoomDomain ?? ["dataMin", "dataMax"]}
              padding={{ left: 0, right: 0 }}
              tickFormatter={(v) => timeLabel(Number(v))}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={yDomain}
              allowDecimals={false}
              tickFormatter={(v) => intTick(Number(v))}
            />
            <Tooltip labelFormatter={(v) => dateTimeLabel(Number(v))} />
            {refAreaLeft !== null && refAreaRight !== null ? (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                fillOpacity={0.15}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="value"
              dot={false}
              strokeWidth={1.2}
              isAnimationActive={false}
            />
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
