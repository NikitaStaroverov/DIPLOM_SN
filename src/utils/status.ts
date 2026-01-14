import type { SensorReading, Thresholds, Status, FieldStatus } from "../types";

export function statusForReading(
  r: SensorReading,
  t: Thresholds,
): FieldStatus["wetness"] {
  // not used directly
  return "good";
}

export function metricStatus(
  value: number,
  warnMin: number,
  warnMax: number,
  dangerMinOrMax: number,
  mode: "min" | "max",
): Status {
  // mode=min: bad if value < dangerMinOrMax; warn if outside warnMin..warnMax; else good
  // mode=max: bad if value > dangerMinOrMax; warn if outside warnMin..warnMax; else good
  if (mode === "min") {
    if (value < dangerMinOrMax) return "bad";
    if (value < warnMin || value > warnMax) return "warn";
    return "good";
  }
  if (value > dangerMinOrMax) return "bad";
  if (value < warnMin || value > warnMax) return "warn";
  return "good";
}

export function aggregateStatus(statuses: Status[]): Status {
  // bad > warn > good
  if (statuses.includes("bad")) return "bad";
  if (statuses.includes("warn")) return "warn";
  return "good";
}

export function fieldStatusFromReadings(
  readings: SensorReading[],
  thresholds: Thresholds,
): FieldStatus {
  const wet = readings.map((r) =>
    metricStatus(
      r.wetness,
      thresholds.wetness.warnMin,
      thresholds.wetness.warnMax,
      thresholds.wetness.dangerMin,
      "min",
    ),
  );
  const temp = readings.map((r) =>
    metricStatus(
      r.temperature,
      thresholds.temperature.warnMin,
      thresholds.temperature.warnMax,
      thresholds.temperature.dangerMax,
      "max",
    ),
  );
  const chg = readings.map((r) =>
    metricStatus(
      r.charge,
      thresholds.charge.warnMin,
      thresholds.charge.warnMax,
      thresholds.charge.dangerMin,
      "min",
    ),
  );

  const wetAgg = aggregateStatus(wet);
  const tempAgg = aggregateStatus(temp);
  const chgAgg = aggregateStatus(chg);

  // агрегированное состояние по логике "если хотя бы один красный — красный, иначе если хотя бы один желтый — желтый"
  const status = aggregateStatus([wetAgg, tempAgg, chgAgg]);

  return {
    fieldId: "",
    status,
    wetness: wetAgg,
    temperature: tempAgg,
    charge: chgAgg,
  };
}
