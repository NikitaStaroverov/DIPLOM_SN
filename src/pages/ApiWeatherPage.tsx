import React, { useEffect, useState } from "react";
import FieldTabs from "../components/FieldTabs";
import { useAppStore } from "../store";
import { fetchYandexWeather } from "../services/weather";

export default function ApiWeatherPage() {
  const fields = useAppStore((s) => s.fields);
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? "1");
  const field = fields.find((f) => f.id === fieldId) ?? fields[0];

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function load() {
    if (!field) return;
    setLoading(true);
    const res = await fetchYandexWeather(field.coords.lat, field.coords.lon);
    setData(res);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [fieldId]); // eslint-disable-line

  return (
    <div className="card">
      <div className="h1">API (Яндекс.Погода)</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Текущие значения температуры/влажности по координатам поля.
      </div>

      <FieldTabs fields={fields} activeId={fieldId} onChange={setFieldId} />

      <div style={{ height: 12 }} />

      <div className="grid2">
        <div className="card">
          <div className="h2">{field?.name}</div>
          <div className="muted">
            Координаты: {field?.coords.lat}, {field?.coords.lon}
          </div>

          <div style={{ height: 12 }} />
          <button className="btn btnPrimary" onClick={load} disabled={loading}>
            {loading ? "Загрузка…" : "Обновить"}
          </button>

          <div style={{ height: 12 }} />

          {data?.error ? (
            <div style={{ color: "var(--warn)" }}>
              {data.error}
              <div className="muted" style={{ marginTop: 6 }}>
                Подсказка: добавьте{" "}
                <span className="kbd">VITE_YANDEX_WEATHER_KEY</span> и настройте
                прокси (см. README).
              </div>
            </div>
          ) : (
            <>
              <div className="row" style={{ marginTop: 8 }}>
                <span className="badge">
                  Температура: <b>{data?.temperature ?? "—"}</b>°C
                </span>
                <span className="badge">
                  Влажность: <b>{data?.humidity ?? "—"}</b>%
                </span>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="h2">Ответ API Яндекс.Погоды</div>
          <div
            className="card"
            style={{ padding: 12, background: "rgba(0,0,0,.18)" }}
          >
            <pre
              style={{
                margin: 0,
                maxHeight: 360,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {JSON.stringify(data?.raw ?? data, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
