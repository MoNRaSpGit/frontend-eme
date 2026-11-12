export function money(value: number) {
  return "$ " + Math.round(value).toLocaleString("es-UY");
}

export function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
}

export function dateOf(iso: string) {
  return new Date(iso).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
}

export function isSameDay(iso: string, now = new Date()) {
  const date = new Date(iso);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

export function isSameMonth(iso: string, now = new Date()) {
  const date = new Date(iso);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
