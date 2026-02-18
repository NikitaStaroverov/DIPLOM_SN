/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEATHER_API_URL?: string;
  readonly VITE_YANDEX_WEATHER_KEY?: string;
  readonly VITE_SENSORS_LOG_URL?: string;
  readonly VITE_SENSORS_LOG_FALLBACKS?: string;
  readonly VITE_ALLOW_CF_WORKER_FALLBACK?: "true" | "false";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
