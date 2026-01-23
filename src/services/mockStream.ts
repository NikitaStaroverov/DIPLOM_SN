import type { SensorReading, Field } from "../types";

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
    sensorId: "006",
    timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T10:00:00.000`,
    temperature: 25,
    wetness: 40,
    charge: 20,
  })),

  // 31 — КРАСНЫЙ (критический заряд)
  {
    fieldId: "2",
    sensorId: "006",
    timestamp: "2026-01-31T10:00:00.000",
    temperature: 25,
    wetness: 40,
    charge: 5, // bad
  },
] as const;

export function injectDemo(readingsByField: Record<string, SensorReading[]>) {
  for (const r of demoReadings as unknown as SensorReading[]) {
    if (!readingsByField[r?.fieldId]) readingsByField[r?.fieldId] = [];
    readingsByField[r?.fieldId].push(r);
  }
}
