import React from "react";

type Status = "good" | "warn" | "bad";

function statusClass(s: Status) {
  return s === "bad" ? "bad" : s === "warn" ? "warn" : "good";
}

// Приоритет: bad > warn > good
function aggregate(a: Status, b: Status, c: Status): Status {
  if (a === "bad" || b === "bad" || c === "bad") return "bad";
  if (a === "warn" || b === "warn" || c === "warn") return "warn";
  return "good";
}

export function FieldStatusBadge(props: {
  wetness: Status;
  temperature: Status;
  charge: Status;
  id: string;
  size?: number; // диаметр большого круга
}) {
  const size = props.size ?? 220;
  const big = aggregate(props.wetness, props.temperature, props.charge);

  const rBig = size / 2;
  const rSmall = Math.round(size * 0.12); // размер маленьких
  const gap = Math.round(size * 0.08);

  // Расположение 3 кружков внутри (треугольником)
  const cx = rBig;
  const cy = rBig;
  const top = { x: cx, y: cy - rSmall - gap };
  const left = { x: cx - rSmall - gap, y: cy + rSmall * 0.6 };
  const right = { x: cx + rSmall + gap, y: cy + rSmall * 0.6 };

  return (
    <div className="field-badge">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Большой круг */}
        <circle
          cx={cx}
          cy={cy}
          r={rBig - 3}
          className={`big ${statusClass(big)}`}
        />

        {/* Маленькие круги */}
        <circle
          cx={top.x}
          cy={top.y}
          r={rSmall}
          className={`small ${statusClass(props.wetness)}`}
        />
        <circle
          cx={left.x}
          cy={left.y}
          r={rSmall}
          className={`small ${statusClass(props.temperature)}`}
        />
        <circle
          cx={right.x}
          cy={right.y}
          r={rSmall}
          className={`small ${statusClass(props.charge)}`}
        />

        {/* Подписи (опционально, можно убрать) */}
        <text x={top.x} y={top.y + 5} textAnchor="middle" className="lbl">
          В
        </text>
        <text x={left.x} y={left.y + 5} textAnchor="middle" className="lbl">
          Т
        </text>
        <text x={right.x} y={right.y + 5} textAnchor="middle" className="lbl">
          З
        </text>

        <text x={top.x} y={top.y - 40} textAnchor="middle" className="lbl">
          {props.id}
        </text>
      </svg>
    </div>
  );
}
