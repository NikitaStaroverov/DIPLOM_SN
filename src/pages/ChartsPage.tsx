import React, { useMemo, useState } from 'react';
import FieldTabs from '../components/FieldTabs';
import { useAppStore } from '../store';
import type { SensorReading } from '../types';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

function toTimeLabel(ts: number){
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

function avg(arr: number[]){
  if (!arr.length) return null;
  return Math.round((arr.reduce((a,b)=>a+b,0)/arr.length)*10)/10;
}

export default function ChartsPage(){
  const fields = useAppStore(s => s.fields);
  const readingsByField = useAppStore(s => s.readingsByField);

  const [fieldId, setFieldId] = useState(fields[0]?.id ?? '1');
  const field = fields.find(f => f.id === fieldId) ?? fields[0];
  const [sensorId, setSensorId] = useState(field?.sensors[0] ?? '001');

  // Keep sensorId valid when switching fields
  React.useEffect(() => {
    const f = fields.find(x => x.id === fieldId);
    if (!f) return;
    if (!f.sensors.includes(sensorId)) setSensorId(f.sensors[0] ?? sensorId);
  }, [fieldId, fields]); // eslint-disable-line

  const avgSeries = useMemo(() => {
    const rs = (readingsByField[fieldId] ?? []).slice(-2000);
    // group by tick timestamp (here tick generates same ts)
    const byTs = new Map<number, SensorReading[]>();
    for (const r of rs){
      const list = byTs.get(r.ts) ?? [];
      list.push(r);
      byTs.set(r.ts, list);
    }
    const rows = Array.from(byTs.entries()).sort((a,b)=>a[0]-b[0]).slice(-180).map(([ts, list]) => ({
      t: toTimeLabel(ts),
      wetness: avg(list.map(x=>x.wetness)),
      temperature: avg(list.map(x=>x.temperature)),
      charge: avg(list.map(x=>x.charge)),
    }));
    return rows;
  }, [readingsByField, fieldId]);

  const sensorSeries = useMemo(() => {
    const rs = (readingsByField[fieldId] ?? []).filter(r => r.sensorId === sensorId).slice(-180);
    return rs.map(r => ({
      t: toTimeLabel(r.ts),
      wetness: r.wetness,
      temperature: r.temperature,
      charge: r.charge,
    }));
  }, [readingsByField, fieldId, sensorId]);

  return (
    <div className="card">
      <div className="h1">Графики</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Реальное время: данные добавляются справа каждые ~10 секунд.
      </div>

      <FieldTabs fields={fields} activeId={fieldId} onChange={setFieldId} />

      <div style={{ height: 12 }} />

      <div className="grid2">
        <div className="card">
          <div className="h2">Средние по полю</div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={avgSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="wetness" dot={false} />
                <Line type="monotone" dataKey="temperature" dot={false} />
                <Line type="monotone" dataKey="charge" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="h2">Конкретный датчик</div>
            <select className="input" style={{ maxWidth: 180 }} value={sensorId} onChange={e => setSensorId(e.target.value)}>
              {(field?.sensors ?? []).map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={sensorSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="wetness" dot={false} />
                <Line type="monotone" dataKey="temperature" dot={false} />
                <Line type="monotone" dataKey="charge" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
