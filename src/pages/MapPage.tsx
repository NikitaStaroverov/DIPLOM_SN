import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import FieldTabs from "../components/FieldTabs";
import { useAppStore } from "../store";
import type { SensorReading, Status } from "../types";
import { aggregateStatus, metricStatus } from "../utils/status";

function statusColor(s: Status) {
  return s === "good"
    ? "var(--good)"
    : s === "warn"
      ? "var(--warn)"
      : "var(--bad)";
}

function makeLayout(sensorIds: string[]) {
  // Простая «условная» раскладка: сетка 5xN
  const cols = 5;
  return sensorIds.map((id, idx) => {
    const x = (idx % cols) * 150 + 90;
    const y = Math.floor(idx / cols) * 110 + 80;
    return { id, x, y };
  });
}

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

  const sensorStatus = (id: string): Status => {
    const r = latestBySensor.get(id);
    if (!r) return "warn";
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
    return aggregateStatus([wet, temp, chg]);
  };

  if (!field) return null;

  return (
    <div className="card">
      <div className="h1">Карта датчиков</div>

      <FieldTabs fields={fields} activeId={fieldId} onChange={setFieldId} />

      <div style={{ height: 14 }} />

      <div className="card" style={{ padding: 12 }}>
        <svg width="100%" viewBox="0 0 820 420" style={{ display: "block" }}>
          <rect
            x="10"
            y="10"
            width="800"
            height="400"
            rx="16"
            fill="rgba(255,255,255,.03)"
            stroke="rgba(255,255,255,.08)"
          />
          <text x="30" y="42" fill="rgba(123, 142, 209, 0.85)" fontSize="16">
            {field.name}
          </text>

          {layout.map((s, idx) => {
            const st = sensorStatus(s.id);
            const c = statusColor(st);
            const r = latestBySensor.get(s.id);
            return (
              <g key={s.id}>
                {/* connecting lines - decorative */}
                {idx > 0 && (
                  <line
                    x1={layout[idx - 1].x}
                    y1={layout[idx - 1].y}
                    x2={s.x}
                    y2={s.y}
                    stroke="rgba(255,255,255,.08)"
                  />
                )}
                <circle
                  cx={s.x}
                  cy={s.y}
                  r="26"
                  fill="rgba(0,0,0,.15)"
                  stroke="rgba(255,255,255,.10)"
                />
                <circle cx={s.x} cy={s.y} r="18" fill={c} opacity="0.85" />
                <text
                  x={s.x}
                  y={s.y + 5}
                  textAnchor="middle"
                  fill="#0b1020"
                  fontWeight="700"
                  fontSize="12"
                >
                  {s.id}
                </text>

                {r && (
                  <text
                    x={s.x}
                    y={s.y + 42}
                    textAnchor="middle"
                    fill="rgba(106, 122, 180, 0.75)"
                    fontSize="11"
                  >
                    {`${r.wetness}% / ${r.temperature}°C / ${r.charge}%`}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
