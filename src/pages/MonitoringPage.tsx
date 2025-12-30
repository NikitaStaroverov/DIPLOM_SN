import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import type { Status, SensorReading } from '../types';
import { aggregateStatus, metricStatus } from '../utils/status';
import StatusBadge from '../components/StatusBadge';

function statusColor(s: Status) {
  return s === 'good' ? 'var(--good)' : s === 'warn' ? 'var(--warn)' : 'var(--bad)';
}

export default function MonitoringPage() {
  const fields = useAppStore(s => s.fields);
  const thresholds = useAppStore(s => s.thresholds);
  const readingsByField = useAppStore(s => s.readingsByField);
  const navigate = useNavigate();

  const rows = useMemo(() => {
    return fields.map(f => {
      const readings = (readingsByField[f.id] ?? []).slice(-f.sensors.length); // последние для каждого
      const latestBySensor = new Map<string, SensorReading>();
      for (let i = readings.length - 1; i >= 0; i--) {
        const r = readings[i];
        if (!latestBySensor.has(r.sensorId)) latestBySensor.set(r.sensorId, r);
      }
      const latest = Array.from(latestBySensor.values());

      const wet = latest.map(r => metricStatus(r.wetness, thresholds.wetness.warnMin, thresholds.wetness.warnMax, thresholds.wetness.dangerMin, 'min'));
      const temp = latest.map(r => metricStatus(r.temperature, thresholds.temperature.warnMin, thresholds.temperature.warnMax, thresholds.temperature.dangerMax, 'max'));
      const chg = latest.map(r => metricStatus(r.charge, thresholds.charge.warnMin, thresholds.charge.warnMax, thresholds.charge.dangerMin, 'min'));

      const wetAgg = aggregateStatus(wet);
      const tempAgg = aggregateStatus(temp);
      const chgAgg = aggregateStatus(chg);
      const status = aggregateStatus([wetAgg, tempAgg, chgAgg]);

      return { field: f, status, wetAgg, tempAgg, chgAgg, sensorsOnline: latest.length };
    });
  }, [fields, thresholds, readingsByField]);

  return (
    <div className="card">
      <div className="h1">Мониторинг</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Агрегированное состояние поля: если есть «красный» — поле красное, иначе если есть «желтый» — поле желтое.
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Поле</th>
            <th>Состояние</th>
            <th>Влажность</th>
            <th>Температура</th>
            <th>Заряд</th>
            <th>Датчики (посл.)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.field.id}>
              <td>
                <button className="btn" onClick={() => navigate('/map', { state: { fieldId: r.field.id } })}>
                  {r.field.name}
                </button>
              </td>
              <td><span className="dot" style={{ background: statusColor(r.status) }} />&nbsp;{r.status}</td>
              <td><StatusBadge status={r.wetAgg} label={r.wetAgg} /></td>
              <td><StatusBadge status={r.tempAgg} label={r.tempAgg} /></td>
              <td><StatusBadge status={r.chgAgg} label={r.chgAgg} /></td>
              <td className="muted">{r.sensorsOnline} / {r.field.sensors.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
