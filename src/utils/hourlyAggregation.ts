import type { SensorReading, Status } from "../types";
import { aggregateStatus, metricStatus } from "./status";

export function aggregateHour(
  readings: SensorReading[],
  thresholds: any
): Status {
  const statuses: Status[] = [];

  for (const r of readings) {
    const wet = metricStatus(
      r.wetness,
      thresholds.wetness.warnMin,
      thresholds.wetness.warnMax,
      thresholds.wetness.dangerMin,
      "min"
    );
    const temp = metricStatus(
      r.temperature,
      thresholds.temperature.warnMin,
      thresholds.temperature.warnMax,
      thresholds.temperature.dangerMax,
      "max"
    );
    const chg = metricStatus(
      r.charge,
      thresholds.charge.warnMin,
      thresholds.charge.warnMax,
      thresholds.charge.dangerMin,
      "min"
    );

    statuses.push(wet, temp, chg);
  }

  return aggregateStatus(statuses);
}