import { SensorReading } from "../types";

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

// Demo sensorReading
export function buildKrasnodarDayTempSeries(opts: {
  dateLocal: string; // "2026-01-05"
  sensorId: string; // "001"
  minC?: number; // ночной минимум
  maxC?: number; // дневной максимум
  peakHour?: number; // час пика
  stepMinutes?: number; // 60 = каждый час, 15 = каждые 15 минут
}): SensorReading[] {
  const {
    dateLocal,
    sensorId,
    minC = 14,
    maxC = 31,
    peakHour = 15,
    stepMinutes = 60,
  } = opts;

  const [Y, M, D] = dateLocal.split("-").map(Number);
  const start = new Date(Y, M - 1, D, 0, 0, 0, 0).getTime();
  const stepMs = stepMinutes * 60 * 1000;

  const amp = (maxC - minC) / 2;
  const mid = (maxC + minC) / 2;

  // Сдвиг: чтобы максимум был в peakHour
  // sin() достигает 1 при (pi/2), значит:
  // angle = 2π*(t/24) + phase, phase = π/2 - 2π*(peakHour/24)
  const phase = Math.PI / 2 - 2 * Math.PI * (peakHour / 24);

  const points: SensorReading[] = [];
  const end = start + 24 * 60 * 60 * 1000;

  for (let i = 0; ; i++) {
    const tMs = start + i * stepMs;
    if (tMs >= end) break;
    const hour = (i * stepMinutes) / 60; // 0..24

    // базовая синусоида: плавный рост/падение
    let temp = mid + amp * Math.sin(2 * Math.PI * (hour / 24) + phase);

    points.push({
      timestamp: tMs,
      sensorId,
      temperature: temp,
      wetness: 40,
      charge: 22,
    });
  }

  return points;
}

// Генерирует влажность (%), обратно зависящую от температуры, с плавностью и шумом
export function applyHumidityFromTemperature(
  series: SensorReading[],
  opts?: {
    // базовый уровень для региона/сезона
    baseRh?: number; // например 55
    // сила обратной связи: чем выше, тем сильнее падает RH при росте T
    invK?: number; // например 2.2 (% на 1°C)
    // минимальная/максимальная влажность
    minRh?: number; // например 25
    maxRh?: number; // например 95
    // “эффект полива” — небольшой подъём RH утром/вечером
    irrigationBoost?: boolean;
  },
): SensorReading[] {
  const baseRh = opts?.baseRh ?? 55;
  const invK = opts?.invK ?? 2.2;
  const minRh = opts?.minRh ?? 25;
  const maxRh = opts?.maxRh ?? 95;
  const irrigationBoost = opts?.irrigationBoost ?? true;

  if (!series.length) return series;

  // возьмём среднюю температуру суток как опорную
  const tAvg = series.reduce((s, r) => s + r.temperature, 0) / series.length;

  // сглаживание влажности (иначе будет рвано)
  let prevRh = baseRh;

  return series.map((r, i) => {
    const d = new Date(r.timestamp);
    const h = d.getHours();

    // 1) обратная зависимость от температуры относительно среднего
    let rh = baseRh - invK * (r.temperature - tAvg);

    // 2) суточная “форма”: максимум RH перед рассветом, минимум днём
    // +4..+8 ночью, -4..-8 днём (плавно)
    const diurnal = 6 * Math.cos((2 * Math.PI * (h - 5)) / 24); // пик около 05:00
    rh += diurnal;

    // 3) эффект полива: лёгкий подъём влажности утром/вечером
    if (irrigationBoost) {
      if (h >= 5 && h <= 7) rh += 5; // утренний полив/роса
      if (h >= 19 && h <= 21) rh += 4; // вечерний полив
    }

    // 4) небольшой шум (ветер/облака)
    const noise = 1.5 * Math.sin(0.8 * i) + 0.7 * Math.sin(0.17 * i);
    rh += noise;

    // 5) сглаживание (экспоненциальное)
    rh = 0.75 * prevRh + 0.25 * rh;

    // 6) границы и округление
    rh = clamp(rh, minRh, maxRh);
    rh = Math.round(rh * 10) / 10;

    prevRh = rh;

    return { ...r, wetness: rh };
  });
}

export function applyBatteryCharge(
  series: SensorReading[],
  opts?: {
    startCharge?: number; // начальный заряд, %
    minCharge?: number; // минимум, %
    drainPerHour?: number; // базовый разряд в %/час
    tempExtraDrainK?: number; // доп. разряд за жару
    solarCharge?: boolean; // имитация подзарядки днём
  },
): SensorReading[] {
  const startCharge = opts?.startCharge ?? 92;
  const minCharge = opts?.minCharge ?? 5;
  const drainPerHour = opts?.drainPerHour ?? 0.25; // ~6% в сутки
  const tempExtraDrainK = opts?.tempExtraDrainK ?? 0.015; // разряд усиливается при T>28
  const solarCharge = opts?.solarCharge ?? true;

  if (!series.length) return series;

  const sorted = series.slice().sort((a, b) => a.timestamp - b.timestamp);
  let charge = startCharge;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = i === 0 ? cur : sorted[i - 1];

    const dtHours = Math.max(
      0,
      (cur.timestamp - prev.timestamp) / (60 * 60 * 1000),
    );

    // базовый разряд
    let drain = drainPerHour * dtHours;

    // жарко -> расход выше
    if (cur.temperature > 28) {
      drain += (cur.temperature - 28) * tempExtraDrainK * dtHours;
    }

    // "солнечная подзарядка" с 11 до 16 часов (чуть-чуть)
    if (solarCharge) {
      const h = new Date(cur.timestamp).getHours();
      if (h >= 11 && h <= 16) {
        // компенсируем часть разряда
        drain -= 0.12 * dtHours;
      }
    }

    // небольшой шум
    drain += 0.02 * Math.sin(i * 0.7);

    charge = clamp(charge - drain, minCharge, 100);
    sorted[i] = { ...cur, charge: Math.round(charge * 10) / 10 };
  }

  return sorted;
}
