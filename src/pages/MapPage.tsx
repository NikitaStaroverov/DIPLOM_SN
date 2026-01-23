import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import FieldTabs from "../components/FieldTabs";
import { FieldStatusBadge } from "../components/FieldStatusBadge";
import { useAppStore } from "../store";
import type { SensorReading, Status } from "../types";
import { metricStatus } from "../utils/status";

function statusColor(s: Status) {
  return s === "good"
    ? "var(--good)"
    : s === "warn"
      ? "var(--warn)"
      : "var(--bad)";
}

function makeLayout(sensorIds: string[]) {
  const cols = 5; // ← ПЯТЬ кружков в ряд
  const stepX = 210; // расстояние между центрами по X
  const stepY = 210; // расстояние между рядами по Y
  const startX = 130; // отступ слева
  const startY = 130; // центр первого ряда

  return sensorIds.map((id, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    return {
      id,
      x: startX + col * stepX,
      y: startY + row * stepY,
      row,
    };
  });
}

const badgeSize = 200;

export default function MapPage() {
  const fields = useAppStore((s) => s.fields);
  const thresholds = useAppStore((s) => s.thresholds);
  const readingsByField = useAppStore((s) => s.readingsByField);

  const location = useLocation();
  const initialFieldId =
    (location.state as any)?.fieldId ?? fields[0]?.id ?? "1";

  const [fieldId, setFieldId] = useState<string>(initialFieldId);

  const field = fields.find((f) => f.id === fieldId) ?? fields[0];

  const latestBySensor = useMemo(() => {
    const readings = readingsByField[fieldId] ?? [];
    const map = new Map<string, SensorReading>();
    for (let i = readings.length - 1; i >= 0; i--) {
      const r = readings[i];
      if (!map.has(r.sensorId)) map.set(r.sensorId, r);
      if (map.size >= (field?.sensors.length ?? 0)) break;
    }
    return map;
  }, [readingsByField, fieldId, field?.sensors.length]);

  const layout = useMemo(
    () => makeLayout(field?.sensors ?? []),
    [field?.sensors],
  );

  const rows = useMemo(() => {
    const ys = Array.from(new Set(layout.map((p) => p.y))).sort(
      (a, b) => a - b,
    );
    return ys;
  }, [layout]);

  const colsX = useMemo(() => {
    return Array.from(new Set(layout.map((p) => p.x))).sort((a, b) => a - b);
  }, [layout]);

  const width = useMemo(() => {
    const xs = layout.map((p) => p.x);
    const maxX = xs.length ? Math.max(...xs) : 0;
    return maxX + 130; // запас справа
  }, [layout]);

  const height = useMemo(() => {
    const ys = layout.map((p) => p.y);
    const maxY = ys.length ? Math.max(...ys) : 0;
    return maxY + 130; // запас снизу
  }, [layout]);

  const sensorStatus = (
    id: string,
  ): { wet: Status; temp: Status; chg: Status } => {
    const r = latestBySensor.get(id);
    if (!r) return { wet: "warn", temp: "warn", chg: "warn" };
    const wet = metricStatus(
      r.wetness,
      thresholds.wetness.warnMin,
      thresholds.wetness.warnMax,
      thresholds.wetness.dangerMin,
      "min",
    );
    const temp = metricStatus(
      r.temperature,
      thresholds.temperature.warnMin,
      thresholds.temperature.warnMax,
      thresholds.temperature.dangerMax,
      "max",
    );
    const chg = metricStatus(
      r.charge,
      thresholds.charge.warnMin,
      thresholds.charge.warnMax,
      thresholds.charge.dangerMin,
      "min",
    );

    return { wet, temp, chg };
  };

  if (!field) return null;

  return (
    <div className="card">
      <div className="h1">Карта датчиков</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Т - температура, В - влажность, З - заряд.
      </div>

      <FieldTabs fields={fields} activeId={fieldId} onChange={setFieldId} />

      <div style={{ height: 14 }} />

      <div className="card-sheme" style={{ width: "100%", minHeight: 500 }}>
        {/* Линии */}
        <svg
          className="map-lines"
          width={width}
          height={height}
          style={{ width: width, height: height }}
        >
          {/* Горизонтальные линии */}
          {rows.map((y) => (
            <line
              key={y}
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke="#111827"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
          {/* Вертикальные линии */}
          {colsX.map((x) => (
            <line
              key={`v-${x}`}
              x1={x}
              y1={0}
              x2={x}
              y2={height}
              stroke="#111827"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Кружки */}
        {layout.map((s) => {
          const st = sensorStatus(s.id);

          return (
            <div
              key={s.id}
              className="map-node"
              style={{ left: s.x, top: s.y }}
            >
              <FieldStatusBadge
                wetness={st.wet}
                temperature={st.temp}
                charge={st.chg}
                id={s.id}
                size={badgeSize}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
