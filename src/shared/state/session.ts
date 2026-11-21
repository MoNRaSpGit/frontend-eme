// Sesion de EME (20/11/2026). El token se guarda en este navegador; "Recordar
// mi cuenta" guarda SOLO el nombre de usuario (nunca la contraseña).
const TOKEN_KEY = "eme.session.token";
const USER_KEY = "eme.session.user";
const REMEMBER_KEY = "eme.rememberedUsername";

export type SessionUser = { id: number; username: string; role: "admin" | "cliente"; displayName: string };

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // sin almacenamiento: la sesion dura mientras la pestaña este abierta
  }
}

let memoryToken: string | null = read(TOKEN_KEY);
const listeners = new Set<() => void>();

export function getToken(): string | null {
  return memoryToken;
}

export function getSessionUser(): SessionUser | null {
  try {
    const raw = read(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: SessionUser) {
  memoryToken = token;
  write(TOKEN_KEY, token);
  write(USER_KEY, JSON.stringify(user));
  listeners.forEach((listener) => listener());
}

export function clearSession() {
  memoryToken = null;
  write(TOKEN_KEY, null);
  write(USER_KEY, null);
  listeners.forEach((listener) => listener());
}

export function onSessionChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRememberedUsername(): string {
  return read(REMEMBER_KEY) ?? "";
}

export function setRememberedUsername(username: string | null) {
  write(REMEMBER_KEY, username);
}
