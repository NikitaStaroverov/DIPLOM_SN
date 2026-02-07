import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;

app.get("/api/weather", async (req, res) => {
  try {
    const { lat, lon, lang = "ru_RU" } = req.query;
    if (!lat || !lon)
      return res.status(400).json({ error: "lat и lon обязательны" });

    const url = `https://api.weather.yandex.ru/v2/informers?lat=${lat}&lon=${lon}&lang=${lang}`;
    const r = await fetch(url, {
      headers: { "X-Yandex-Weather-Key": process.env.YANDEX_WEATHER_KEY },
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: "Ошибка запроса погоды" });
  }
});

app.get("/api/sensors-log", async (req, res) => {
  try {
    const url = "https://spl.decadalab.ru/responder_spl_dat_test/data/log.txt";
    const r = await fetch(url);

    if (!r.ok) {
      return res.status(r.status).send(`Ошибка загрузки log.txt: ${r.status}`);
    }

    const text = await r.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(text);
  } catch (e) {
    res.status(500).send("Ошибка при запросе log.txt");
  }
});

app.listen(PORT, () => console.log(`Weather proxy on :${PORT}`));
