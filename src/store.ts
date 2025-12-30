import { create } from 'zustand';
import type { SensorReading, Thresholds, Field } from './types';
import { loadSettings, saveSettings, defaultSettings, type SettingsState } from './services/storage';

type AuthState = {
  isAuthed: boolean;
  username: string;
  login: (u: string, p: string) => boolean;
  logout: () => void;
  resetToDefault: () => void;
  setCredentials: (u: string, p: string) => void;
};

type DataState = {
  fields: Field[];
  thresholds: Thresholds;
  readingsByField: Record<string, SensorReading[]>; // append-only demo
  appendReading: (fieldId: string, r: SensorReading) => void;
  setThresholds: (t: Thresholds) => void;
  setFields: (fields: Field[]) => void;
  reloadFromStorage: () => void;
};

type AppState = AuthState & DataState;

function load(): SettingsState {
  return loadSettings();
}

export const useAppStore = create<AppState>((set, get) => {
  const settings = load();
  return {
    isAuthed: false,
    username: settings.auth.username,

    login: (u, p) => {
      const s = loadSettings();
      const ok = u === s.auth.username && p === s.auth.password;
      if (ok) set({ isAuthed: true, username: u });
      return ok;
    },
    logout: () => set({ isAuthed: false }),
    resetToDefault: () => {
      saveSettings(defaultSettings);
      const s = loadSettings();
      set({ thresholds: s.thresholds, fields: s.fields, username: s.auth.username, isAuthed: false });
    },
    setCredentials: (u, p) => {
      const s = loadSettings();
      const next: SettingsState = { ...s, auth: { username: u, password: p } };
      saveSettings(next);
      set({ username: u });
    },

    fields: settings.fields,
    thresholds: settings.thresholds,
    readingsByField: {},

    appendReading: (fieldId, r) => {
      set(state => {
        const prev = state.readingsByField[fieldId] ?? [];
        const next = [...prev, r].slice(-20_000); // safety cap
        return { readingsByField: { ...state.readingsByField, [fieldId]: next } };
      });
    },
    setThresholds: (t) => {
      const s = loadSettings();
      saveSettings({ ...s, thresholds: t });
      set({ thresholds: t });
    },
    setFields: (fields) => {
      const s = loadSettings();
      saveSettings({ ...s, fields });
      set({ fields });
    },
    reloadFromStorage: () => {
      const s = loadSettings();
      set({ fields: s.fields, thresholds: s.thresholds, username: s.auth.username });
    },
  };
});
