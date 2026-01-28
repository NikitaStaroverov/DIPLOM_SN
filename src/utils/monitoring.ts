export type Status = "good" | "warn" | "bad" | "nodata";

export type Thresholds = {
  temperature: { warnMin: number; warnMax: number; dangerMax: number };
  wetness: { warnMin: number; warnMax: number; dangerMin: number };
  charge: { warnMin: number; warnMax: number; dangerMin: number };
};

export type SensorReading = {
  fieldId: string;
  sensorId: string;
  timestamp: string; // ISO
  temperature: number;
  wetness: number;
  charge: number;
};

const rank: Record<Status, number> = { nodata: 0, good: 1, warn: 2, bad: 3 };

export function maxStatus(a: Status, b: Status): Status {
  return rank[a] >= rank[b] ? a : b;
}

export function metricStatus(
  value: number,
  warnMin: number,
  warnMax: number,
  danger: number,
  mode: "min" | "max",
): Status {
  // danger: порог “опасно”
  if (mode === "max") {
    if (value > danger) return "bad";
    if (value < warnMin || value > warnMax) return "warn";
    return "good";
  } else {
    if (value < danger) return "bad";
    if (value < warnMin || value > warnMax) return "warn";
    return "good";
  }
}

export function readingStatus(r: SensorReading, t: Thresholds): Status {
  const sT = metricStatus(
    r.temperature,
    t.temperature.warnMin,
    t.temperature.warnMax,
    t.temperature.dangerMax,
    "max",
  );
  const sW = metricStatus(
    r.wetness,
    t.wetness.warnMin,
    t.wetness.warnMax,
    t.wetness.dangerMin,
    "min",
  );
  const sB = metricStatus(
    r.charge,
    t.charge.warnMin,
    t.charge.warnMax,
    t.charge.dangerMin,
    "min",
  );

  // агрегирование “ИЛИ”: если любая метрика ухудшилась — ухудшается весь статус
  return [sT, sW, sB].reduce<Status>((acc, s) => maxStatus(acc, s), "good");
}

export function dayKey(d: Date): string {
  // YYYY-MM-DD (local)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeFieldDayStatus(
  readings: SensorReading[],
  thresholds: Thresholds,
  year: number,
  monthIndex0: number, // 0..11
  day: number, // 1..31
): Status {
  const targetKey = dayKey(new Date(year, monthIndex0, day));

  let result: Status = "nodata";
  for (const r of readings) {
    const dk = dayKey(new Date(r.timestamp));
    if (dk !== targetKey) continue;

    result = result === "nodata" ? "good" : result;
    result = maxStatus(result, readingStatus(r, thresholds));
    if (result === "bad") return "bad"; // ранний выход
  }
  return result;
}
