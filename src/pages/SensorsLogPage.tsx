import React, { useEffect, useState } from "react";

export default function SensorsLogPage() {
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");

  const RAW_LOG_URL =
    "https://spl.decadalab.ru/responder_spl_dat_test/data/log.txt";

  const LOG_URL = import.meta.env.DEV
    ? "/api/sensors-log"
    : `https://api.allorigins.win/raw?url=${encodeURIComponent(RAW_LOG_URL)}`;

  async function loadLog() {
    try {
      setError("");
      const r = await fetch(`${LOG_URL}?t=${Date.now()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text();
      setText(t);
    } catch (e: any) {
      setError(e?.message ?? "Ошибка загрузки");
    }
  }

  useEffect(() => {
    loadLog();
    const id = window.setInterval(loadLog, 10_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="card"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="h1">Сведения с датчиков</div>

      <div className="muted" style={{ marginBottom: 12 }}>
        Данные загружаются из файла log.txt
      </div>

      {error && (
        <div className="card" style={{ padding: 12 }}>
          Ошибка: {error}
        </div>
      )}

      <div
        className="card"
        style={{
          padding: 12,
          background: "rgba(0,0,0,.18)",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <pre
          style={{
            margin: 0,
            height: "100%",
            overflow: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {text || "Загрузка…"}
        </pre>
      </div>
    </div>
  );
}
