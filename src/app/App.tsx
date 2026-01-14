import React, { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAppStore } from "../store";
import { startMockStream, subscribe } from "../services/mockStream";
import Layout from "./Layout";
import LoginPage from "../pages/LoginPage";
import MonitoringPage from "../pages/MonitoringPage";
import SensorsLogPage from "../pages/SensorsLogPage";
import ChartsPage from "../pages/ChartsPage";
import ApiWeatherPage from "../pages/ApiWeatherPage";
import SettingsPage from "../pages/SettingsPage";
import MapPage from "../pages/MapPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthed = useAppStore((s) => s.isAuthed);
  const loc = useLocation();
  if (!isAuthed)
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  const fields = useAppStore((s) => s.fields);
  const appendReading = useAppStore((s) => s.appendReading);

  useEffect(() => {
    // Запускаем демо-поток данных
    startMockStream(fields);
    return () => {
      subscribe((reading, fieldId) => appendReading(fieldId, reading));
    };
  }, [fields, appendReading]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/monitoring" replace />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/logs" element={<SensorsLogPage />} />
        <Route path="/charts" element={<ChartsPage />} />
        <Route path="/api" element={<ApiWeatherPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
