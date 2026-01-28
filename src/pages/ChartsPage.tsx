import React, { useMemo, useState } from "react";
import FieldTabs from "../components/FieldTabs";
import { useAppStore } from "../store";
import type { SensorReading } from "../types";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PARAMS = [
  { name: "Влажность", value: "wetness" },
  { name: "Температура", value: "temperature" },
  { name: "Заряд", value: "charge" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toTimeLabel(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function dayStartLocal(ts: number) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayKeyLocal(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function avg(arr: number[]) {
  if (!arr.length) return null;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 5) / 5;
}

function buildHourTicks(start: number, end: number) {
  const ticks: number[] = [];
  const H = 60 * 60 * 1000;
  for (let t = start; t <= end; t += H) ticks.push(t);
  return ticks;
}

function yAxisLabel(param: string) {
  switch (param) {
    case "wetness":
      return "Влажность, %";
    case "temperature":
      return "Температура, °C";
    case "charge":
      return "Заряд, %";
    default:
      return "";
  }
}

function yAxisPropsForParam(param: string) {
  switch (param) {
    case "wetness":
      return {
        domain: [30, 100],
        ticks: Array.from({ length: 15 }, (_, i) => 30 + i * 5),
      };
    case "temperature":
      return {
        domain: [15, 40],
        ticks: Array.from({ length: 6 }, (_, i) => 15 + i * 5),
      };
    case "charge":
      return {
        domain: [5, 100],
        ticks: Array.from({ length: 20 }, (_, i) => 5 + i * 5),
      };
    default:
      return {};
  }
}

export default function ChartsPage() {
  const fields = useAppStore((s) => s.fields);
  const readingsByField = useAppStore((s) => s.readingsByField);

  const [fieldId, setFieldId] = useState(fields[0]?.id ?? "1");
  const field = fields.find((f) => f.id === fieldId) ?? fields[0];

  const [sensorId, setSensorId] = useState(field?.sensors[0] ?? "001");

  const [averageSelectedParam, setAverageSelectedParam] = useState("wetness");
  const [selectedParam, setSelectedParam] = useState("wetness");

  // Keep sensorId valid when switching fields
  React.useEffect(() => {
    const f = fields.find((x) => x.id === fieldId);
    if (!f) return;
    if (!f.sensors.includes(sensorId)) setSensorId(f.sensors[0] ?? sensorId);
  }, [fieldId, fields]); // eslint-disable-line

  // 1) Собираем список доступных дат по полю (для выбора)
  const availableDays = useMemo(() => {
    const rs = (readingsByField[fieldId] ?? [])
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp);
    const set = new Set<string>();
    for (const r of rs) set.add(dayKeyLocal(r.timestamp));
    return Array.from(set).sort();
  }, [readingsByField, fieldId]);

  // 2) Выбранный день: по умолчанию последний доступный
  const [selectedDay, setSelectedDay] = useState<string>("");

  React.useEffect(() => {
    if (!availableDays.length) return;
    // если текущий selectedDay невалиден — ставим последний
    if (!selectedDay || !availableDays.includes(selectedDay)) {
      setSelectedDay(availableDays[availableDays.length - 1]);
    }
  }, [availableDays]); // eslint-disable-line

  // 3) Границы выбранных суток в ms
  const dayRange = useMemo(() => {
    if (!selectedDay) return null;
    const [Y, M, D] = selectedDay.split("-").map(Number);
    const start = new Date(Y, M - 1, D, 0, 0, 0, 0).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return { start, end };
  }, [selectedDay]);

  const xDomain = useMemo(() => {
    if (!dayRange) return undefined;
    return [dayRange.start, dayRange.end] as const;
  }, [dayRange]);

  const xTicks = useMemo(() => {
    if (!dayRange) return [];
    return buildHourTicks(dayRange.start, dayRange.end);
  }, [dayRange]);

  // Sensors that actually have data for the selected day
  const sensorsWithData = useMemo(() => {
    if (!dayRange) return [];
    const set = new Set<string>();
    for (const r of readingsByField[fieldId] ?? []) {
      if (r.timestamp >= dayRange.start && r.timestamp < dayRange.end) {
        set.add(r.sensorId);
      }
    }
    return Array.from(set).sort();
  }, [readingsByField, fieldId, dayRange]);

  React.useEffect(() => {
    if (!sensorsWithData.length) return;
    if (!sensorsWithData.includes(sensorId)) {
      setSensorId(sensorsWithData[0]);
    }
  }, [sensorsWithData]); // eslint-disable-line

  // 4) Данные суток по полю (все датчики) — для "Средние по полю"
  const dayReadingsForField = useMemo(() => {
    if (!dayRange) return [];
    const rs = (readingsByField[fieldId] ?? [])
      .filter(
        (r) => r.timestamp >= dayRange.start && r.timestamp < dayRange.end,
      )
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp);
    return rs;
  }, [readingsByField, fieldId, dayRange]);

  // 5) Средние по полю: группируем по часу (или по точному timestamp, но лучше по часу)
  const avgSeries = useMemo(() => {
    if (!dayRange) return [];

    const byHour = new Map<number, SensorReading[]>();
    for (const r of dayReadingsForField) {
      const d = new Date(r.timestamp);
      const hourStart = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        0,
        0,
        0,
      ).getTime();
      const list = byHour.get(hourStart) ?? [];
      list.push(r);
      byHour.set(hourStart, list);
    }

    return Array.from(byHour.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ts, list]) => ({
        ts,
        t: toTimeLabel(ts),
        wetness: avg(list.map((x) => x.wetness)),
        temperature: avg(list.map((x) => x.temperature)),
        charge: avg(list.map((x) => x.charge)),
      }));
  }, [dayReadingsForField, dayRange]);

  // 6) Данные суток по выбранному датчику
  const sensorSeries = useMemo(() => {
    if (!dayRange) return [];

    const rs = (readingsByField[fieldId] ?? [])
      .filter((r) => r.sensorId === sensorId)
      .filter(
        (r) => r.timestamp >= dayRange.start && r.timestamp < dayRange.end,
      )
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp);

    return rs.map((r) => ({
      ts: r.timestamp,
      t: toTimeLabel(r.timestamp),
      wetness: r.wetness,
      temperature: r.temperature,
      charge: r.charge,
    }));
  }, [readingsByField, fieldId, sensorId, dayRange]);

  const xAxisProps = {
    dataKey: "ts",
    type: "number" as const,
    domain: xDomain ?? (["dataMin", "dataMax"] as const),
    tickFormatter: (v: any) => toTimeLabel(Number(v)),
    tick: { fontSize: 11 },
    ticks: xTicks.length ? xTicks : undefined,
    minTickGap: 0,
    interval: 0 as const,
  };

  const chartWidth = Math.max(900, xTicks.length * 60);

  return (
    <div className="card">
      <div className="h1">Графики</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Сутки: отображение данных за выбранную дату (00:00–24:00).
      </div>

      <FieldTabs fields={fields} activeId={fieldId} onChange={setFieldId} />

      <div style={{ height: 12 }} />

      {/* Выбор даты */}
      <div
        className="row"
        style={{ gap: 12, alignItems: "center", marginBottom: 12 }}
      >
        <div className="muted" style={{ minWidth: 90 }}>
          Дата:
        </div>
        <select
          className="input"
          style={{ maxWidth: 180 }}
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          disabled={!availableDays.length}
        >
          {availableDays.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="charts">
        {/* Средние по полю */}
        <div className="card">
          <div
            className="row"
            style={{
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <div className="h2">Средние по полю</div>
            <select
              className="input"
              style={{ maxWidth: 180 }}
              value={averageSelectedParam}
              onChange={(e) => setAverageSelectedParam(e.target.value)}
            >
              {PARAMS.map((param) => (
                <option key={param.value} value={param.value}>
                  {param.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart
                  data={avgSeries}
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    {...xAxisProps}
                    label={{
                      value: "Время",
                      position: "insideBottom",
                      offset: -5,
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    {...yAxisPropsForParam(averageSelectedParam)}
                    interval={0}
                    label={{
                      value: yAxisLabel(averageSelectedParam),
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip labelFormatter={(v) => toTimeLabel(Number(v))} />
                  <Line
                    type="monotone"
                    dataKey={averageSelectedParam}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Конкретный датчик */}
        <div className="card">
          <div
            className="row"
            style={{
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <div className="h2">Конкретный датчик</div>

            <select
              className="input"
              style={{ maxWidth: 180 }}
              value={selectedParam}
              onChange={(e) => setSelectedParam(e.target.value)}
            >
              {PARAMS.map((param) => (
                <option key={param.value} value={param.value}>
                  {param.name}
                </option>
              ))}
            </select>

            <select
              className="input"
              style={{ maxWidth: 180 }}
              value={sensorId}
              onChange={(e) => setSensorId(e.target.value)}
            >
              {(field?.sensors ?? []).map((id) => (
                <option key={id} value={id}>
                  {`Датчик ${id}`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart
                  data={sensorSeries}
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    {...xAxisProps}
                    label={{
                      value: "Время",
                      position: "insideBottom",
                      offset: -5,
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    {...yAxisPropsForParam(selectedParam)}
                    interval={0}
                    label={{
                      value: yAxisLabel(selectedParam),
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip labelFormatter={(v) => toTimeLabel(Number(v))} />
                  <Line type="monotone" dataKey={selectedParam} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {sensorSeries.length === 0 && (
            <div className="muted" style={{ marginTop: 8 }}>
              Нет данных за выбранную дату для датчика {sensorId}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
