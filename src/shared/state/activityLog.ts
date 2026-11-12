import { API_BASE_URL } from "../config/api";

// Registro interno de uso (12/11/2026, pedido explicito: "ver si la estan
// usando"). No hay pantalla en la app: avisa sola al backend cuando alguien
// entra, elige rol, cambia de pestana o hace algo, y se ve en la app de
// Movimientos (tarjeta "Eme").
//
// "Quien" es un id que se genera solo la primera vez y queda en el navegador.
// Para que NUESTRAS pruebas no se confundan con las del cliente: entrar una
// vez con ?yo=1 en la direccion marca ese navegador como nuestro (el id pasa
// a empezar con "yo-" y en Movimientos sale como "[Nosotros]").
const VISITOR_KEY = "eme-visitor-id";

export type ActivityEvent = "entrada" | "login" | "logout" | "seccion" | "accion";

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function resolveVisitorId() {
  try {
    const markAsOwn = new URLSearchParams(window.location.search).get("yo") === "1";
    let visitorId = window.localStorage.getItem(VISITOR_KEY);
    if (!visitorId || (markAsOwn && !visitorId.startsWith("yo-"))) {
      visitorId = `${markAsOwn ? "yo-" : ""}${randomId()}`.slice(0, 40);
      window.localStorage.setItem(VISITOR_KEY, visitorId);
    }
    return visitorId;
  } catch {
    // Storage bloqueado: igual se registra, pero cada recarga cuenta como visitante nuevo.
    return randomId().slice(0, 40);
  }
}

// En localhost no se registra nada: el backend local apunta a la base real.
const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const visitorId = resolveVisitorId();

// Nunca rompe ni demora la app: si el aviso falla, se pierde y listo.
export function trackActivity(event: ActivityEvent, detail?: string) {
  if (isLocal) return;
  fetch(`${API_BASE_URL}/eme/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId, event, detail: detail?.slice(0, 200) }),
    keepalive: true
  }).catch(() => {});
}
