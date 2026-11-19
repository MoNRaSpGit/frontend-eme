import { useSyncExternalStore } from "react";
import { API_BASE_URL } from "../../shared/config/api";
import { trackActivity } from "../../shared/state/activityLog";
import type { Channel, EmeState, Kind, Order, OrderLine, Payment, Product } from "./eme.types";

// EME en produccion (18/11/2026): los datos viven en tablas del backend
// (pedidos, clientes, productos, repartidores). Cada accion llama a su endpoint
// y el servidor devuelve el estado fresco. Cada 2 s se consulta si cambio algo
// (otro dispositivo); si no cambio, el servidor responde "sin cambios".
export type SyncStatus = "conectando" | "en-linea" | "sin-conexion";

const EMPTY: EmeState = { orders: [], clients: [], couriers: [], products: [], categories: [] };

let state: EmeState = EMPTY;
let version = -1;
let syncStatus: SyncStatus = "conectando";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setStatus(next: SyncStatus) {
  if (syncStatus !== next) {
    syncStatus = next;
    emit();
  }
}

type ServerReply = { ok: boolean; version: number; unchanged?: boolean; state: EmeState | null; orderNumber?: number };

async function api(path: string, init?: RequestInit): Promise<ServerReply> {
  const response = await fetch(API_BASE_URL + path, { ...init, headers: { "Content-Type": "application/json" } });
  if (!response.ok) {
    let message = "No se pudo guardar. Revisá la conexión.";
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (data.message) message = Array.isArray(data.message) ? data.message[0] : data.message;
    } catch {
      // sin cuerpo
    }
    throw new Error(message);
  }
  return (await response.json()) as ServerReply;
}

function adopt(reply: ServerReply) {
  if (reply.state) state = reply.state;
  version = reply.version;
  setStatus("en-linea");
  emit();
}

async function poll() {
  try {
    const reply = await api(version >= 0 ? "/eme/state?since=" + version : "/eme/state");
    if (reply.unchanged) setStatus("en-linea");
    else adopt(reply);
  } catch {
    setStatus("sin-conexion");
  }
}

// Escritura: llama al endpoint; si falla, avisa y no cambia nada en pantalla.
async function write(path: string, method: string, body?: unknown): Promise<ServerReply | null> {
  try {
    const reply = await api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    adopt(reply);
    return reply;
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "No se pudo guardar.");
    return null;
  }
}

if (typeof window !== "undefined") {
  void poll();
  window.setInterval(() => void poll(), 2000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void poll();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEme(): EmeState {
  return useSyncExternalStore(subscribe, () => state);
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, () => syncStatus);
}

// ---------------- Pedidos ----------------
export type NewOrderInput = {
  channel: Channel;
  kind: Kind;
  table?: number | null;
  lines: OrderLine[];
  note?: string;
  clientName?: string;
  phone?: string;
  address?: string;
  payment?: Payment;
  clientId?: number | null;
};

// Devuelve el pedido ya GUARDADO en el servidor (o null si no se pudo guardar).
export async function createOrder(input: NewOrderInput): Promise<Order | null> {
  const reply = await write("/eme/orders", "POST", input);
  if (!reply?.orderNumber) return null;
  const made = state.orders.find((order) => order.number === reply.orderNumber) ?? null;
  if (made) {
    trackActivity(
      "accion",
      made.channel === "mesa"
        ? "Pedido #" + made.number + " de la mesa " + made.table + " enviado a caja ($" + Math.round(made.total) + ")"
        : "Pedido #" + made.number + " ingresado en caja" + (made.clientName ? " (" + made.clientName + ")" : "") + " ($" + Math.round(made.total) + ")"
    );
  }
  return made;
}

function patchOrder(id: string, body: { action: "accept" | "reject" | "courier" | "delivered"; courierId?: number }) {
  void write("/eme/orders/" + encodeURIComponent(id), "PATCH", body);
}

export function acceptOrder(id: string) {
  trackActivity("accion", "Pedido aceptado en caja");
  patchOrder(id, { action: "accept" });
}

export function rejectOrder(id: string) {
  trackActivity("accion", "Pedido rechazado en caja");
  patchOrder(id, { action: "reject" });
}

export function assignCourier(id: string, courierId: number) {
  trackActivity("accion", "Repartidor asignado");
  patchOrder(id, { action: "courier", courierId });
}

export function markDelivered(id: string) {
  trackActivity("accion", "Pedido marcado como entregado");
  patchOrder(id, { action: "delivered" });
}

// ---------------- Cuenta corriente ----------------
export function addClient(name: string, phone: string, address: string) {
  trackActivity("accion", "Cliente agregado a cuenta corriente: " + name);
  void write("/eme/clients", "POST", { name, phone, address });
}

export function registerPayment(clientId: number, amount: number) {
  trackActivity("accion", "Pago registrado en cuenta corriente ($" + Math.round(amount) + ")");
  void write("/eme/clients/" + clientId + "/payments", "POST", { amount });
}

// ---------------- Productos y categorias ----------------
export function productsOf(current: EmeState): Product[] {
  return current.products ?? [];
}

export function categoriesOf(current: EmeState): string[] {
  return current.categories ?? [];
}

export type ProductInput = { id?: string; name: string; price: number; cost?: number; category: string; ingredients: string[] };

export function saveProduct(input: ProductInput) {
  const body = { name: input.name, price: input.price, cost: input.cost, category: input.category, ingredients: input.ingredients.map((item) => item.trim()).filter(Boolean) };
  void (input.id ? write("/eme/products/" + encodeURIComponent(input.id), "PUT", body) : write("/eme/products", "POST", body));
}

export function deleteProduct(id: string) {
  void write("/eme/products/" + encodeURIComponent(id), "DELETE");
}

export function addCategory(name: string) {
  if (name.trim()) void write("/eme/categories", "POST", { name: name.trim() });
}
