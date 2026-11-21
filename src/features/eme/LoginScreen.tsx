import { useState, type FormEvent } from "react";
import { getRememberedUsername, setRememberedUsername } from "../../shared/state/session";
import { loadInitialState, login } from "./eme.store";

// Login de Nueva Pizzería (20/11/2026). Mientras se ingresa se aprovecha para
// traer todo (pedidos, productos, caja) y precargar las imagenes pesadas; se
// muestra un cartelito con el dia de la semana.
const DAY_MOOD = [
  { day: "Domingo", emoji: "😌", text: "Domingo tranqui" },
  { day: "Lunes", emoji: "😩", text: "Lunes… arrancamos" },
  { day: "Martes", emoji: "💪", text: "Martes, a meterle" },
  { day: "Miércoles", emoji: "🐪", text: "Miércoles, mitad de semana" },
  { day: "Jueves", emoji: "😏", text: "Jueves, ya casi" },
  { day: "Viernes", emoji: "🍻", text: "¡Viernes! Salud" },
  { day: "Sábado", emoji: "🍕", text: "Sábado de pizza" }
];

const PRELOAD_IMAGES = ["app-logo.png", "ticket-logo.png"];
const MIN_LOADING_MS = 1300;

function preloadImages(): Promise<void> {
  return Promise.all(
    PRELOAD_IMAGES.map(
      (file) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = import.meta.env.BASE_URL + file;
        })
    )
  ).then(() => undefined);
}

export function LoginScreen({ onReady }: { onReady: () => void }) {
  const remembered = getRememberedUsername();
  const [username, setUsername] = useState(remembered);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(Boolean(remembered));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const mood = DAY_MOOD[new Date().getDay()];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!username.trim() || !password) return setError("Completá usuario y contraseña.");
    setError("");
    setLoading(true);
    const started = Date.now();
    try {
      await login(username, password);
      setRememberedUsername(remember ? username.trim().toLowerCase() : null);
      setPassword("");
      await Promise.all([loadInitialState(), preloadImages()]);
      const wait = MIN_LOADING_MS - (Date.now() - started);
      if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
      onReady();
    } catch (err) {
      setPassword("");
      setError(err instanceof Error ? err.message : "No se pudo ingresar.");
      setLoading(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={(event) => void submit(event)}>
        <img className="auth-logo" src={import.meta.env.BASE_URL + "app-logo.png"} alt="Nueva Pizzería Tacuarembó" />
        <h1>Nueva Pizzería</h1>
        <p className="auth-sub">Caja · Pedidos · Tickets</p>

        <label className="auth-field">
          <span>Usuario</span>
          <input
            id="eme-username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={loading}
          />
        </label>
        <label className="auth-field">
          <span>Contraseña</span>
          <input
            id="eme-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
          />
        </label>
        <label className="auth-remember">
          <input id="eme-remember" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={loading} />
          <span>Recordar mi cuenta</span>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn primary wide auth-submit" disabled={loading}>
          Ingresar
        </button>
        <p className="auth-foot">Sistema Logic Lab</p>
      </form>

      {loading && (
        <div className="auth-loading" role="status" aria-live="polite">
          <div className="auth-loading-card">
            <span className="auth-mood">{mood.emoji}</span>
            <b>{mood.text}</b>
            <span className="auth-spinner" aria-hidden="true" />
            <small>Cargando todo…</small>
          </div>
        </div>
      )}
    </main>
  );
}
