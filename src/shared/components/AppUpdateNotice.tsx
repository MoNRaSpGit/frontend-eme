import { useEffect, useRef, useState } from "react";
import { fetchPublishedFrontendBuildMeta, FRONTEND_BUILD_INFO } from "../build";

const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 1000;
const APP_CACHE_PREFIX = "eme-";
// Cuanto tarda la barra en llenarse. La limpieza real (service worker +
// cache) lleva mucho menos; la barra existe para que se VEA que la app se
// esta actualizando y no parezca un parpadeo raro.
const PROGRESS_DURATION_MS = 2200;
const PROGRESS_TICK_MS = 40;

// Actualizacion automatica (13/11/2026, pedido explicito): si hay version
// nueva y NADIE toco la app en los ultimos 10 minutos, se actualiza sola y
// en silencio (no hay nada en curso que perder). Si hay movimiento, solo
// sale el cartel y decide la persona; si lo ignora, se actualiza sola cuando
// pasen 10 minutos sin tocar nada.
const AUTO_UPDATE_IDLE_MS = 10 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 15 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "input", "wheel"] as const;
// Una sola actualizacion automatica por version publicada: si por algun
// motivo la pagina sigue viendose vieja despues de recargar, no entra en
// un bucle de recargas.
const AUTO_DONE_KEY = "eme-auto-update-done";

// Limpieza real: desregistra el service worker, borra el cache de la app y
// deja todo listo para que el reload traiga la version nueva.
async function clearAppCache() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const appBasePath = new URL(import.meta.env.BASE_URL, window.location.href).pathname;
      await Promise.all(
        registrations
          .filter((registration) => registration.scope.includes(appBasePath))
          .map((registration) => registration.unregister())
      );
    }

    if ("caches" in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith(APP_CACHE_PREFIX)).map((key) => window.caches.delete(key)));
    }
  } catch {
    // Si la limpieza falla, igual se recarga: es lo que trae la version nueva.
  }
}

// Aviso de "hay una nueva actualizacion": un cartel abajo a la izquierda y,
// al tocar Actualizar, una barra de progreso que toma toda la pantalla y
// recarga la app cuando termina.
//
// Los pedidos no se pierden al recargar: viven en el servidor (y una copia
// en el celular), solo se pierde lo que se estaba escribiendo sin enviar.
// Por eso la actualizacion automatica espera 10 minutos sin tocar nada.
export function AppUpdateNotice() {
  const [publishedSha, setPublishedSha] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const updatingRef = useRef(false);

  const updateAvailable = publishedSha !== null;

  // Ultimo toque de la persona en la app (siempre activo, es barato).
  useEffect(() => {
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, markActivity, { passive: true });
    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, markActivity);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    let mounted = true;

    const checkForUpdates = async () => {
      try {
        const published = await fetchPublishedFrontendBuildMeta();
        if (mounted && published.releaseSha && published.releaseSha !== FRONTEND_BUILD_INFO.releaseSha) {
          setPublishedSha(published.releaseSha);
        }
      } catch {
        // Silencioso: se reintenta solo en el proximo chequeo.
      }
    };

    void checkForUpdates();
    const intervalId = window.setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") void checkForUpdates();
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, []);

  // Con una version nueva esperando: ver si hay movimiento o no.
  useEffect(() => {
    if (!publishedSha) return;

    const evaluate = () => {
      if (updatingRef.current) return;
      const idle = Date.now() - lastActivityRef.current >= AUTO_UPDATE_IDLE_MS;
      setIsIdle(idle);
      if (!idle) return;

      let alreadyDone = false;
      try {
        alreadyDone = window.sessionStorage.getItem(AUTO_DONE_KEY) === publishedSha;
      } catch {
        // sin storage: se intenta igual
      }
      if (alreadyDone) return;

      // Sin movimiento: actualiza sola y en silencio (nadie esta mirando).
      updatingRef.current = true;
      try {
        window.sessionStorage.setItem(AUTO_DONE_KEY, publishedSha);
      } catch {
        // ignorar
      }
      void clearAppCache().then(() => window.location.reload());
    };

    evaluate();
    const intervalId = window.setInterval(evaluate, IDLE_CHECK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [publishedSha]);

  function handleUpdate() {
    if (progress !== null || updatingRef.current) return;
    updatingRef.current = true;
    setProgress(0);

    const cleanup = clearAppCache();
    const startedAt = Date.now();

    const intervalId = window.setInterval(() => {
      const next = Math.min(100, Math.round(((Date.now() - startedAt) / PROGRESS_DURATION_MS) * 100));
      setProgress(next);

      if (next >= 100) {
        window.clearInterval(intervalId);
        // Se recarga recien con la barra llena Y la limpieza terminada.
        void cleanup.then(() => window.location.reload());
      }
    }, PROGRESS_TICK_MS);
  }

  if (progress !== null) {
    return (
      <div className="update-overlay" role="status" aria-live="polite">
        <div className="update-overlay-card">
          <img src={`${import.meta.env.BASE_URL}LogoFoto.png`} alt="Logic Lab" />
          <strong>{progress < 100 ? "Actualizando la aplicación…" : "¡Listo!"}</strong>
          <div
            className="update-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="update-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
        </div>
      </div>
    );
  }

  // El cartel solo sale si hay movimiento; sin movimiento se actualiza sola.
  if (!updateAvailable || isIdle) {
    return null;
  }

  return (
    <aside className="update-banner" role="status" aria-live="polite">
      <strong>Hay una nueva actualización</strong>
      <button type="button" className="btn primary small" onClick={handleUpdate}>
        Actualizar
      </button>
    </aside>
  );
}
