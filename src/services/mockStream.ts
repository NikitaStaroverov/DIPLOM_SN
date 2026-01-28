import type { SensorReading, Field } from "../types";
import {
  applyBatteryCharge,
  applyHumidityFromTemperature,
  buildKrasnodarDayTempSeries,
} from "./demoDataUtils";

/**
 * Эмулятор потока данных датчиков (каждые 10 секунд).
 * В реальном проекте замените на WebSocket/MQTT/REST.
 */
type Subscriber = (reading: SensorReading, fieldId: string) => void;

const subs = new Set<Subscriber>();
let timer: number | null = null;

function randomBetween(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function tick(fields: Field[]) {
  const ts = Date.now();
  for (const f of fields) {
    // раз в тик выдаем значения от части датчиков, чтобы не "засорять" демо
    const subset = f.sensors.slice(0, Math.min(f.sensors.length, 5));
    for (const sensorId of subset) {
      const reading: SensorReading = {
        timestamp: ts,
        sensorId,
        wetness: Math.round(randomBetween(15, 85)),
        temperature: Math.round(randomBetween(10, 38)),
        charge: Math.round(randomBetween(5, 100)),
      };
      subs.forEach((fn) => fn(reading, f.id));
    }
  }
}

export function startMockStream(fields: Field[]) {
  if (timer) return;
  tick(fields);
  timer = window.setInterval(() => tick(fields), 10_000);
}

export function stopMockStream() {
  if (!timer) return;
  window.clearInterval(timer);
  timer = null;
}

export function subscribe(fn: Subscriber) {
  subs.add(fn);
  return () => subs.delete(fn);
}

// Demo readingsByField
export const demoReadings = [
  /* =========================
     ПОЛЕ КРАСНОДАР (fieldId = "1")
     ========================= */

  // дни 01–07 — НОРМА (зелёный)
  ...Array.from({ length: 7 }, (_, i) => ({
    fieldId: "1",
    sensorId: "001",
    timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T10:00:00.000`,
    temperature: 25,
    wetness: 40,
    charge: 20,
  })),

  // 08 — ЖЁЛТЫЙ (температура ниже нормы)
  {
    fieldId: "1",
    sensorId: "001",
    timestamp: "2026-01-08T10:00:00.000",
    temperature: 19, // warn
    wetness: 40,
    charge: 20,
  },

  // 09 — НОРМА
  {
    fieldId: "1",
    sensorId: "001",
    timestamp: "2026-01-09T10:00:00.000",
    temperature: 25,
    wetness: 40,
    charge: 20,
  },

  // 10 — КРАСНЫЙ (опасная температура)
  {
    fieldId: "1",
    sensorId: "002",
    timestamp: "2026-01-10T10:00:00.000",
    temperature: 31, // bad
    wetness: 40,
    charge: 20,
  },

  // 11 — НОРМА
  {
    fieldId: "1",
    sensorId: "002",
    timestamp: "2026-01-11T10:00:00.000",
    temperature: 25,
    wetness: 40,
    charge: 20,
  },

  // 12 — ЖЁЛТЫЙ (влажность выше нормы)
  {
    fieldId: "1",
    sensorId: "003",
    timestamp: "2026-01-12T10:00:00.000",
    temperature: 25,
    wetness: 55, // warn
    charge: 20,
  },

  // 13 — КРАСНЫЙ (опасная влажность)
  {
    fieldId: "1",
    sensorId: "003",
    timestamp: "2026-01-13T10:00:00.000",
    temperature: 25,
    wetness: 25, // bad
    charge: 20,
  },

  // дни 14–31 — НОРМА
  ...Array.from({ length: 18 }, (_, i) => ({
    fieldId: "1",
    sensorId: "004",
    timestamp: `2026-01-${String(i + 14).padStart(2, "0")}T10:00:00.000`,
    temperature: 25,
    wetness: 40,
    charge: 20,
  })),

  /* =========================
     ПОЛЕ Н. НОВГОРОД (fieldId = "2")
     ========================= */

  // дни 01–30 — НОРМА
  ...Array.from({ length: 30 }, (_, i) => ({
    fieldId: "2",
    sensorId: "011",
    timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T10:00:00.000`,
    temperature: 25,
    wetness: 40,
    charge: 20,
  })),

  // 31 — КРАСНЫЙ (критический заряд)
  {
    fieldId: "2",
    sensorId: "011",
    timestamp: "2026-01-31T10:00:00.000",
    temperature: 25,
    wetness: 40,
    charge: 5, // bad
  },
] as const;

const base = new Date("2026-01-05T00:00:00").getTime(); // начало суток (локально)
const H = 60 * 60 * 1000;

export const krasnodarDayTempReadings = buildKrasnodarDayTempSeries({
  dateLocal: "2026-01-20", // для Краснодара летом логичнее
  sensorId: "001",
  minC: 17,
  maxC: 30,
  peakHour: 15,
  stepMinutes: 60,
});
export const krasnodarDayReadings = applyBatteryCharge(
  applyHumidityFromTemperature(krasnodarDayTempReadings, {
    baseRh: 52, // Краснодар летом часто 45–65% днём
    invK: 2.4, // сильная обратная связь
    minRh: 28,
    maxRh: 92,
    irrigationBoost: true,
  }),
  {
    startCharge: 86,
    drainPerHour: 0.9, // ~7.2% в сутки
    solarCharge: true,
  },
);

export const krasnodarDayTempReadings2 = buildKrasnodarDayTempSeries({
  dateLocal: "2026-01-20", // для Краснодара летом логичнее
  sensorId: "002",
  minC: 15,
  maxC: 25,
  peakHour: 15,
  stepMinutes: 60,
});
export const krasnodarDayReadings2 = applyBatteryCharge(
  applyHumidityFromTemperature(krasnodarDayTempReadings2, {
    baseRh: 52, // Краснодар летом часто 45–65% днём
    invK: 2.4, // сильная обратная связь
    minRh: 28,
    maxRh: 92,
    irrigationBoost: true,
  }),
  {
    startCharge: 96,
    drainPerHour: 0.8, // ~7.2% в сутки
    solarCharge: true,
  },
);

export const krasnodarDayTempReadings3 = buildKrasnodarDayTempSeries({
  dateLocal: "2026-01-20", // для Краснодара летом логичнее
  sensorId: "003",
  minC: 19,
  maxC: 35,
  peakHour: 15,
  stepMinutes: 60,
});
export const krasnodarDayReadings3 = applyBatteryCharge(
  applyHumidityFromTemperature(krasnodarDayTempReadings3, {
    baseRh: 52, // Краснодар летом часто 45–65% днём
    invK: 2.4, // сильная обратная связь
    minRh: 28,
    maxRh: 92,
    irrigationBoost: true,
  }),
  {
    startCharge: 100,
    drainPerHour: 0.8, // ~7.2% в сутки
    solarCharge: true,
  },
);

export const krasnodarDayTempReadings4 = buildKrasnodarDayTempSeries({
  dateLocal: "2026-01-20", // для Краснодара летом логичнее
  sensorId: "004",
  minC: 18,
  maxC: 30,
  peakHour: 15,
  stepMinutes: 60,
});
export const krasnodarDayReadings4 = applyBatteryCharge(
  applyHumidityFromTemperature(krasnodarDayTempReadings4, {
    baseRh: 52, // Краснодар летом часто 45–65% днём
    invK: 2.4, // сильная обратная связь
    minRh: 28,
    maxRh: 92,
    irrigationBoost: true,
  }),
  {
    startCharge: 90,
    drainPerHour: 0.9, // ~7.2% в сутки
    solarCharge: true,
  },
);

export const krasnodarDayTempReadings5 = buildKrasnodarDayTempSeries({
  dateLocal: "2026-01-20", // для Краснодара летом логичнее
  sensorId: "005",
  minC: 16,
  maxC: 27,
  peakHour: 15,
  stepMinutes: 60,
});

export const krasnodarDayReadings5 = applyBatteryCharge(
  applyHumidityFromTemperature(krasnodarDayTempReadings5, {
    baseRh: 52, // Краснодар летом часто 45–65% днём
    invK: 2.4, // сильная обратная связь
    minRh: 28,
    maxRh: 92,
    irrigationBoost: true,
  }),
  {
    startCharge: 100,
    drainPerHour: 0.7, // ~7.2% в сутки
    solarCharge: true,
  },
);

// export function injectDemo(readingsByField: Record<string, SensorReading[]>) {
//   for (const r of demoReadings as unknown as SensorReading[]) {
//     if (!readingsByField[r?.fieldId]) readingsByField[r?.fieldId] = [];
//     readingsByField[r?.fieldId].push(r);
//   }
// }
type DemoRow = {
  fieldId: string;
  sensorId: string;
  timestamp: string; // строка
  wetness: number;
  temperature: number;
  charge: number;
};

function dayKeyLocal(ts: number) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function injectDemo(
  target: Record<string, SensorReading[]>,
  fields: Field[],
) {
  // 1) конвертируем demoReadings -> readingsByField
  for (const r of demoReadings as unknown as DemoRow[]) {
    const fieldId = r.fieldId;

    const reading: SensorReading = {
      sensorId: r.sensorId,
      timestamp: new Date(r.timestamp).getTime(), // ✅ в unix ms
      wetness: r.wetness,
      temperature: r.temperature,
      charge: r.charge,
    };

    (target[fieldId] ??= []).push(reading);
  }

  // 2) добавляем суточную температуру (уже в unix ms)
  target["1"] = [
    ...(target["1"] ?? []),
    ...krasnodarDayReadings,
    ...krasnodarDayReadings2,
    ...krasnodarDayReadings3,
    ...krasnodarDayReadings4,
    ...krasnodarDayReadings5,
  ];

  // 3) заполняем демо для всех датчиков и всех дней месяца (если нет данных)
  const start = new Date(2026, 0, 1, 0, 0, 0, 0).getTime();
  const end = new Date(2026, 1, 1, 0, 0, 0, 0).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const existingTs = new Set<string>();
  const counts = new Map<string, number>();
  for (const fieldId of Object.keys(target)) {
    for (const r of target[fieldId]) {
      const dayKey = dayKeyLocal(r.timestamp);
      existingTs.add(`${fieldId}|${r.sensorId}|${r.timestamp}`);
      const key = `${fieldId}|${r.sensorId}|${dayKey}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  for (const f of fields) {
    for (const sensorId of f.sensors) {
      for (let t = start; t < end; t += dayMs) {
        const dayKey = dayKeyLocal(t);
        const key = `${f.id}|${sensorId}|${dayKey}`;
        const count = counts.get(key) ?? 0;
        if (count >= 2) continue;

        const hours = [0, 6, 12, 18];
        for (const h of hours) {
          const ts = t + h * 60 * 60 * 1000;
          const tsKey = `${f.id}|${sensorId}|${ts}`;
          if (existingTs.has(tsKey)) continue;
          (target[f.id] ??= []).push({
            sensorId,
            timestamp: ts,
            wetness: 40,
            temperature: 25,
            charge: 20,
          });
        }
      }
    }
  }

  // 4) сортируем по времени
  for (const fieldId of Object.keys(target)) {
    target[fieldId].sort((a, b) => a.timestamp - b.timestamp);
  }
}
