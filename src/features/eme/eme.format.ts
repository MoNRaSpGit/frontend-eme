export function money(value: number) {
  return "$ " + Math.round(value).toLocaleString("es-UY");
}

export function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
}

export function dateOf(iso: string) {
  return new Date(iso).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
}


// Dia comercial (19/11/2026): el local corta a las 3 de la mañana. Un pedido de
// las 2:30 cuenta para el dia anterior. Se corre la hora 3 horas para atras.
export const DAY_CUTOFF_HOUR = 3;
export function businessDate(value: string | Date = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(date.getTime() - DAY_CUTOFF_HOUR * 60 * 60 * 1000);
}

export function isSameDay(iso: string, now = new Date()) {
  const date = businessDate(iso);
  const today = businessDate(now);
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

export function isSameMonth(iso: string, now = new Date()) {
  const date = businessDate(iso);
  const today = businessDate(now);
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}
