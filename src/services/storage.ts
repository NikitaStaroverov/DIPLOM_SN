import type { Field, Thresholds } from "../types";

const KEY = "irrigation.settings.v1";

export type SettingsState = {
  fields: Field[];
  thresholds: Thresholds;
  auth: { username: string; password: string }; // demo only
};

export const defaultSettings: SettingsState = {
  fields: [
    {
      id: "1",
      name: "Поле Краснодар",
      coords: { lat: 44.944645, lon: 37.856681 },
      sensors: [
        "001",
        "002",
        "003",
        "004",
        "005",
        "006",
        "007",
        "008",
        "009",
        "010",
      ],
    },
    {
      id: "2",
      name: "Поле Н. Новгород",
      coords: { lat: 55.925708, lon: 44.027213 },
      sensors: [
        "011",
        "012",
        "013",
        "014",
        "015",
        "016",
        "017",
        "018",
        "019",
        "020",
      ],
    },
  ],
  thresholds: {
    temperature: { warnMin: 20, warnMax: 29, dangerMax: 30 },
    wetness: { warnMin: 30, warnMax: 50, dangerMin: 30 }, // danger: ниже 30
    charge: { warnMin: 10, warnMax: 30, dangerMin: 10 }, // danger: ниже 10 (из ТЗ следует <10 опасно; подстройте)
  },
  auth: { username: "admin", password: "admin" },
};

export function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as SettingsState;
    return parsed;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(s: SettingsState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
