import { useMemo } from "react";
import { useAppStore } from "../store";
import { computeFieldDayStatus } from "../utils/monitoring";
import { useNavigate } from "react-router-dom";

export default function MonitoringPage() {
  const fields = useAppStore((s) => s.fields);
  const thresholds = useAppStore((s) => s.thresholds);
  const readingsByField = useAppStore((s) => s.readingsByField);
  const navigate = useNavigate();

  const now = new Date();
  const year = 2026;
  const monthIndex0 = 0;

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  return (
    <div>
      <h2>Мониторинг</h2>

      <div className="mon-wrap">
        <table className="mon-table">
          <thead>
            <tr>
              <th className="sticky-col">Поле</th>
              {days.map((d) => (
                <th key={d}>{String(d).padStart(2, "0")}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {fields.map((f) => {
              const readings = (readingsByField[f.id] ?? []).slice(
                -f.sensors.length,
              );
              const row = days.map((d) =>
                computeFieldDayStatus(
                  readings,
                  thresholds,
                  year,
                  monthIndex0,
                  d,
                ),
              );

              return (
                <tr key={f.id}>
                  <td className="sticky-col field-link">
                    <button
                      className="btn-mon"
                      onClick={() =>
                        navigate("/map", { state: { fieldId: f.id } })
                      }
                    >
                      {f.name}
                    </button>
                  </td>
                  {row.map((st, idx) => (
                    <td
                      key={idx}
                      className={`cell ${st}`}
                      title={`${f.name} • ${String(idx + 1).padStart(2, "0")}`}
                    ></td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mon-legend">
        <span>
          <span className="lg good" /> Норма
        </span>
        <span>
          <span className="lg warn" /> Требует внимания
        </span>
        <span>
          <span className="lg bad" /> Опасно
        </span>
        <span>
          <span className="lg nodata" /> Нет данных
        </span>
      </div>
    </div>
  );
}
