import React, { useEffect, useState } from "react";
import { fetchSensorsLogText } from "../services/sensorsLogClient";

export default function SensorsLogPage() {
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  async function loadLog() {
    try {
      setError("");
      const t = await fetchSensorsLogText();
      setText(t);
      setUpdatedAt(Date.now());
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
        {updatedAt
          ? `Обновлено: ${new Date(updatedAt).toLocaleTimeString()}`
          : "Загрузка..."}
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
