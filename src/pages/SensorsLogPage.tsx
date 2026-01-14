import React, { useMemo, useState } from "react";
import FieldTabs from "../components/FieldTabs";
import { useAppStore } from "../store";

function formatLine(
  ts: number,
  id: string,
  wet: number,
  temp: number,
  chg: number,
) {
  const d = new Date(ts);

  const DD = String(d.getDate());
  const MM = String(d.getMonth() + 1);
  const YY = String(d.getFullYear()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${YY}-${MM}-${DD} ${hh}:${mm}:${ss} >>> spl.decadalab.ru/responder_spl_dat_test/data/?id=${id},rain=${wet},temp=${temp},charge=${chg}`;
}

export default function SensorsLogPage() {
  const fields = useAppStore((s) => s.fields);
  const readingsByField = useAppStore((s) => s.readingsByField);

  const [fieldId, setFieldId] = useState(fields[0]?.id ?? "1");

  const lines = useMemo(() => {
    const rs = readingsByField[fieldId] ?? [];
    return rs
      .slice(-3000)
      .map((r) =>
        formatLine(r.timestamp, r.sensorId, r.wetness, r.temperature, r.charge),
      );
  }, [readingsByField, fieldId]);

  return (
    <div className="card">
      <div className="h1">Сведения с датчиков</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        id - идентификатор датчика, rain - влажность, temp - температура, charge
        - заряд батареи датчика. Новые строки добавляются каждые ~10 секунд.
      </div>

      <FieldTabs fields={fields} activeId={fieldId} onChange={setFieldId} />

      <div style={{ height: 12 }} />

      <div
        className="card"
        style={{ padding: 12, background: "rgba(0,0,0,.18)" }}
      >
        <pre
          style={{
            margin: 0,
            maxHeight: 520,
            overflow: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {lines.length ? lines.join("\n") : "Пока нет данных…"}
        </pre>
      </div>
    </div>
  );
}
