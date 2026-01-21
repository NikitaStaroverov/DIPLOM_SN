import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import wetherIcon from "./weatherIcon.svg";

function linkClass({ isActive }: { isActive: boolean }) {
  return `pill ${isActive ? "pillActive" : ""}`;
}

export default function Layout() {
  const logout = useAppStore((s) => s.logout);
  const username = useAppStore((s) => s.username);
  const navigate = useNavigate();

  return (
    <>
      <div className="nav">
        <div className="navInner">
          <div className="brand">
            <img
              src={wetherIcon}
              alt=""
              style={{ width: "28px", height: "28px" }}
            />
            <span>Система мониторинга</span>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <NavLink to="/monitoring" className={linkClass}>
              Мониторинг
            </NavLink>
            <NavLink to="/map" className={linkClass}>
              Карта
            </NavLink>
            <NavLink to="/logs" className={linkClass}>
              Сведения
            </NavLink>
            <NavLink to="/charts" className={linkClass}>
              Графики
            </NavLink>
            <NavLink to="/api" className={linkClass}>
              API
            </NavLink>
            <NavLink to="/settings" className={linkClass}>
              Настройки
            </NavLink>
          </div>

          <div className="row">
            <span className="badge">
              <span
                className="dot"
                style={{ background: "rgba(255,255,255,.25)" }}
              />
              {username}
            </span>
            <button
              className="btn"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Выйти
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        <Outlet />
      </div>
    </>
  );
}
