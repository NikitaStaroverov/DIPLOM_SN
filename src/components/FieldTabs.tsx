import React from "react";
import type { Field } from "../types";

export default function FieldTabs({
  fields,
  activeId,
  onChange,
}: {
  fields: Field[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="row" style={{ gap: 8 }}>
      {fields.map((f) => (
        <button
          key={f.id}
          className={`pill ${f.id === activeId ? "pillActive" : ""}`}
          onClick={() => onChange(f.id)}
          type="button"
          title={`${f.name} (${f.coords.lat.toFixed(4)}, ${f.coords.lon.toFixed(4)})`}
        >
          {f.name}
        </button>
      ))}
    </div>
  );
}
