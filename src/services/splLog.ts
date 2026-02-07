export type SplPoint = {
  ts: number; // время в ms
  id: string; // id датчика (как строка, чтобы не ловить NaN)
  coords?: string;

  // параметры (что есть — то будет)
  rain?: number;
  m1?: number;
  m2?: number;
  charge?: number;
  temp?: number;
  aht_m?: number;
  aht_temp?: number;
  bmp_temp?: number;
  bmp_pressure?: number;
};

function parseNumber(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// парсит ОДНУ строку лога
export function parseSplLogLine(line: string): SplPoint | null {
  // пример:
  // 2026-02-07 21:38:55 >>> 89.109.46.243 >>> spl.decadalab.ru/.../?id=0&coords=...&m1=...&...
  const parts = line.split(">>>").map((s) => s.trim());
  if (parts.length < 3) return null;

  const dt = parts[0]; // "2026-02-07 21:38:55"
  const ts = Date.parse(dt.replace(" ", "T")); // локально ок для такого формата
  if (!Number.isFinite(ts)) return null;

  const urlPart = parts[2];
  const qIndex = urlPart.indexOf("?");
  if (qIndex === -1) return null;

  const query = urlPart.slice(qIndex + 1);
  const params = new URLSearchParams(query);

  const id = params.get("id");
  if (!id) return null;

  const point: SplPoint = {
    ts,
    id,
    coords: params.get("coords") ?? undefined,

    rain: parseNumber(params.get("rain")),
    m1: parseNumber(params.get("m1")),
    m2: parseNumber(params.get("m2")),
    charge: parseNumber(params.get("charge")),
    temp: parseNumber(params.get("temp")),
    aht_m: parseNumber(params.get("aht_m")),
    aht_temp: parseNumber(params.get("aht_temp")),
    bmp_temp: parseNumber(params.get("bmp_temp")),
    bmp_pressure: parseNumber(params.get("bmp_pressure")),
  };

  return point;
}

// парсит весь txt (много строк)
export function parseSplLogText(text: string): SplPoint[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseSplLogLine)
    .filter((x): x is SplPoint => x !== null);
}
