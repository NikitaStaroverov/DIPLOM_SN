export type WeatherNow = {
  temperature: number | null;
  humidity: number | null;
  raw?: unknown;
  error?: string;
};

export async function fetchYandexWeather(
  lat: number,
  lon: number,
): Promise<WeatherNow> {
  const headers = {
    "X-Yandex-Weather-Key": "e8987391-1651-49e4-95ac-1025263ef4f5",
  };
  try {
    const responce = await fetch(
      `https://api.weather.yandex.ru/v2/forecast?lat=${lat}&lon=${lon}&lang=ru_RU`,
      { headers },
    );
    if (!responce.ok) throw new Error("Weather request failed");

    const data: any = await responce.json();
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
