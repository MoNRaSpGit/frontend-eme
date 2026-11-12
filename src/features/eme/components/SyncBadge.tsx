import { useSyncStatus } from "../eme.store";

const LABEL = { conectando: "Conectando…", "en-linea": "En línea", "sin-conexion": "Sin conexión" } as const;

// Indica si esta pantalla esta compartiendo la sesion unica con los demas dispositivos.
export function SyncBadge() {
  const status = useSyncStatus();
  return (
    <span className={"sync " + status}>
      <i /> {LABEL[status]}
    </span>
  );
}
