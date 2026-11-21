import { useEffect, useState } from "react";
import { trackActivity } from "../../shared/state/activityLog";
import { getToken, onSessionChange } from "../../shared/state/session";
import { CajaPage } from "./CajaPage";
import { LoginScreen } from "./LoginScreen";
import { logout } from "./eme.store";
import { MesasScreen } from "./screens/MesasScreen";
import type { Role } from "./eme.types";

const ROLE_KEY = "eme-demo-role";

function loadRole(): Role | null {
  try {
    const value = sessionStorage.getItem(ROLE_KEY);
    return value === "mesas" || value === "caja" ? value : null;
  } catch {
    return null;
  }
}

// Demo sin contraseña: el login son dos botones.
export function EmeHomePage() {
  const [role, setRole] = useState<Role | null>(loadRole);
  const [signedIn, setSignedIn] = useState(() => Boolean(getToken()));
  // Si la sesion se cierra (Salir o vencida), vuelve al login.
  useEffect(() => onSessionChange(() => setSignedIn(Boolean(getToken()))), []);

  // Una vez por apertura de la app (para saber si la usan).
  useEffect(() => {
    trackActivity("entrada", role ? "Abrió la app (" + role + ")" : "Abrió la app");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(next: Role | null) {
    trackActivity(next ? "login" : "logout", next ? "Eligió " + (next === "mesas" ? "Mesas" : "Mostrador") : "Salió");
    try {
      if (next) sessionStorage.setItem(ROLE_KEY, next);
      else sessionStorage.removeItem(ROLE_KEY);
    } catch {
      // ignorar
    }
    setRole(next);
  }

  // 18/11/2026: se entra directo al Mostrador (es el unico uso real). La pantalla
  // de "Mesas / Mostrador" queda en el codigo por si se vuelve a usar.
  // 20/11/2026: con login. Sin sesion se ve el login; al salir vuelve ahi.
  if (!signedIn) return <LoginScreen onReady={() => setSignedIn(true)} />;
  if (role === "mesas") return <MesasScreen onLogout={() => choose(null)} />;
  return <CajaPage onLogout={() => void logout()} />;

  return (
    <main className="login">
      <div className="login-card">
        <span className="login-logo">🍴</span>
        <h1>Eme</h1>
        <p>¿Cómo vas a entrar?</p>
        <button type="button" className="login-btn mesas" onClick={() => choose("mesas")}>
          <span>🍽</span>
          <b>Mesas</b>
          <small>Tomar el pedido de la mesa</small>
        </button>
        <button type="button" className="login-btn caja" onClick={() => choose("caja")}>
          <span>🧾</span>
          <b>Mostrador</b>
          <small>Caja, pedidos, cuenta corriente y mes</small>
        </button>
      </div>
    </main>
  );
}
