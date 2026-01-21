import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import FieldTabs from "../components/FieldTabs";
import { FieldStatusBadge } from "../components/FieldStatusBadge";
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

      <div className="card-sheme">
        {layout.map((s, idx) => {
          const st = sensorStatus(s.id);

          return (
            <FieldStatusBadge
              wetness={st.wet}
              temperature={st.temp}
              charge={st.chg}
              id={s.id}
              size={240}
            />
          );
        })}
      </div>
    </div>
  );
}
