export type SensorReading = {
  timestamp: number; // unix ms
  sensorId: string;
  wetness: number; // %
  temperature: number; // °C
  charge: number; // %
};

export type Field = {
  id: string; // "1", "2" ...
  name: string; // "Поле № 1"
  coords: { lat: number; lon: number };
  sensors: string[]; // ids
};

export type Thresholds = {
  wetness: { warnMin: number; warnMax: number; dangerMin: number };
  temperature: { warnMin: number; warnMax: number; dangerMax: number };
  charge: { warnMin: number; warnMax: number; dangerMin: number };
};

export type Status = "good" | "warn" | "bad";

export type FieldStatus = {
  fieldId: string;
  status: Status;
  // by metric
  wetness: Status;
  temperature: Status;
  charge: Status;
};
