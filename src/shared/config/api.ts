const RENDER_API_BASE_URL = "https://saasproback.onrender.com/api/v1";
const LOCAL_API_BASE_URL = "http://localhost:3000/api/v1";

// En produccion (GitHub Pages) apunta al backend de Render; en local, al backend local.
function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return LOCAL_API_BASE_URL;
  }
  return RENDER_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
