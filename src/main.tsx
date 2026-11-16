import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { ServiceNotice } from "./shared/components/ServiceNotice";
import "./styles/global.css";

// PWA solo en produccion (mismo criterio que los otros proyectos).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ServiceNotice appPath="eme" />
    <App />
  </StrictMode>
);
