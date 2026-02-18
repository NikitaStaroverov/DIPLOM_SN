function normalizeBase(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

const BASE_API_ENDPOINT = `${normalizeBase(import.meta.env.BASE_URL)}api/sensors-log`;
const ROOT_API_ENDPOINT = "/api/sensors-log";
const DEFAULT_SENSORS_LOG_ENDPOINTS = [BASE_API_ENDPOINT, ROOT_API_ENDPOINT];

const CF_WORKER_FALLBACK = "https://spl-log-proxy.starovierov98.workers.dev";
const REQUEST_TIMEOUT_MS = 7000;

function unique(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of items) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}

function parseCsv(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "unknown error";
}

export function withCacheBust(url: string) {
  return url.includes("?") ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
}

function resolveSensorLogEndpoints() {
  const preferred = import.meta.env.VITE_SENSORS_LOG_URL?.trim();
  const envFallbacks = parseCsv(import.meta.env.VITE_SENSORS_LOG_FALLBACKS);

  const endpoints = unique([
    ...(preferred ? [preferred] : []),
    ...DEFAULT_SENSORS_LOG_ENDPOINTS,
    ...envFallbacks,
    ...(import.meta.env.VITE_ALLOW_CF_WORKER_FALLBACK === "true"
      ? [CF_WORKER_FALLBACK]
      : []),
  ]);

  return endpoints;
}

export const SENSORS_LOG_ENDPOINTS = resolveSensorLogEndpoints();

async function fetchTextFrom(url: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(withCacheBust(url), {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchSensorsLogText() {
  let lastError: unknown = new Error("No endpoints configured");

  for (const endpoint of SENSORS_LOG_ENDPOINTS) {
    try {
      return await fetchTextFrom(endpoint);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Failed to load sensors log. Tried: ${SENSORS_LOG_ENDPOINTS.join(", ")}. Last error: ${toMessage(lastError)}`,
  );
}
