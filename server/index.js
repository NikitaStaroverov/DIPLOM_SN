import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;

app.get("/api/weather", async (req, res) => {
  try {
    const { lat, lon, lang = "ru_RU" } = req.query;
    const weatherKey = process.env.YANDEX_WEATHER_KEY;

    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon are required" });
    }

    if (!weatherKey) {
      return res.status(500).json({ error: "YANDEX_WEATHER_KEY is not set" });
    }

    const url =
      `https://api.weather.yandex.ru/v2/forecast` +
      `?lat=${lat}&lon=${lon}&lang=${lang}`;
    const response = await fetch(url, {
      headers: { "X-Yandex-Weather-Key": weatherKey },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: "Weather request failed" });
  }
});

app.get("/api/sensors-log", async (_req, res) => {
  try {
    const url = "https://spl.decadalab.ru/responder_spl_dat_test/data/log.txt";
    const response = await fetch(url);

    if (!response.ok) {
      return res
        .status(response.status)
        .send(`Failed to load log.txt: ${response.status}`);
    }

    const text = await response.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(text);
  } catch (error) {
    res.status(500).send("Failed to request log.txt");
  }
});

app.listen(PORT, () => {
  console.log(`API proxy is running on :${PORT}`);
});
