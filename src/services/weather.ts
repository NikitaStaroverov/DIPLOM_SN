export type WeatherNow = {
  temperature: number | null;
  humidity: number | null;
  raw?: unknown;
  error?: string;
};

const DEFAULT_PROXY_URL = "/api/weather";
const DIRECT_WEATHER_URL = "https://api.weather.yandex.ru/v2/forecast";

function parseWeather(data: any): WeatherNow {
  const fact = data?.fact;
  const temperature = typeof fact?.temp === "number" ? fact.temp : null;
  const humidity = typeof fact?.humidity === "number" ? fact.humidity : null;
  return { temperature, humidity, raw: data };
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Ошибка сети";
}

export async function fetchYandexWeather(
  lat: number,
  lon: number,
): Promise<WeatherNow> {
  const proxyUrl = import.meta.env.VITE_WEATHER_API_URL ?? DEFAULT_PROXY_URL;

  try {
    const viaProxy = await fetch(`${proxyUrl}?lat=${lat}&lon=${lon}&lang=ru_RU`, {
      cache: "no-store",
    });

    if (!viaProxy.ok) {
      throw new Error(`Weather proxy HTTP ${viaProxy.status}`);
    }

    const data: any = await viaProxy.json();
    return parseWeather(data);
  } catch (proxyError: unknown) {
    const directKey =
      import.meta.env.VITE_YANDEX_WEATHER_KEY ??
      "e8987391-1651-49e4-95ac-1025263ef4f5";

    if (!directKey) {
      return {
        temperature: null,
        humidity: null,
        error: toErrorMessage(proxyError),
      };
    }

    try {
      const directResponse = await fetch(
        `${DIRECT_WEATHER_URL}?lat=${lat}&lon=${lon}&lang=ru_RU`,
        {
          headers: { "X-Yandex-Weather-Key": directKey },
          cache: "no-store",
        },
      );

      if (!directResponse.ok) {
        throw new Error(`Yandex Weather HTTP ${directResponse.status}`);
      }

      const data: any = await directResponse.json();
      return parseWeather(data);
    } catch (directError: unknown) {
      const proxyMessage = toErrorMessage(proxyError);
      const directMessage = toErrorMessage(directError);
      const combinedError =
        proxyMessage === directMessage
          ? proxyMessage
          : `${proxyMessage}; fallback: ${directMessage}`;

      return {
        temperature: null,
        humidity: null,
        error: combinedError,
      };
    }
  }
}
