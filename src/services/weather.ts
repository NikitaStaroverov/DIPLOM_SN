export type WeatherNow = {
  temperature: number | null;
  humidity: number | null;
  raw?: unknown;
  error?: string;
};

/**
 * Яндекс.Погода требует API-key.
 * Положите его в .env.local как:
 *   VITE_YANDEX_WEATHER_KEY=...
 *
 * Документацию и точные поля ответа лучше уточнить под вашу подписку/тариф.
 * Здесь сделан максимально «мягкий» парсер.
 */
export async function fetchYandexWeather(
  lat: number,
  lon: number,
): Promise<WeatherNow> {
  const key = import.meta.env.VITE_YANDEX_WEATHER_KEY as string | undefined;
  if (!key) {
    return {
      temperature: null,
      humidity: null,
      error: "Не задан VITE_YANDEX_WEATHER_KEY (см. README).",
    };
  }

  // Важно: в браузере запрос к api.weather.yandex.ru может упереться в CORS.
  // Поэтому предусмотрите прокси на backend/Vite server middleware.
  const url = `https://api.weather.yandex.ru/v2/informers?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&lang=ru_RU`;

  try {
    const res = await fetch(url, {
      headers: { "X-Yandex-API-Key": key },
    });
    if (!res.ok) {
      return { temperature: null, humidity: null, error: `HTTP ${res.status}` };
    }
    const data: any = await res.json();
    const fact = data?.fact;
    const temperature = typeof fact?.temp === "number" ? fact.temp : null;
    const humidity = typeof fact?.humidity === "number" ? fact.humidity : null;
    return { temperature, humidity, raw: data };
  } catch (e: any) {
    return {
      temperature: null,
      humidity: null,
      error: e?.message ?? "Ошибка сети",
    };
  }
}
