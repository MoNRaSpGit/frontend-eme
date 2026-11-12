import { useSyncExternalStore } from "react";
import { API_BASE_URL } from "../../shared/config/api";
import { trackActivity } from "../../shared/state/activityLog";
import { MENU } from "./eme.menu";
import type { AccountClient, Channel, EmeState, Kind, Order, OrderLine, Payment } from "./eme.types";

// Demo sin backend: el estado vive en localStorage y se sincroniza entre
// pestañas del mismo navegador (asi se prueba Mesas en una y Caja en otra).
const KEY = "eme-demo-state-v3";

function totalsOf(lines: OrderLine[]) {
  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const cost = lines.reduce((sum, line) => sum + (MENU.find((item) => item.id === line.productId)?.cost ?? 0) * line.qty, 0);
  return { total, cost };
}

function lineOf(productId: string, qty: number): OrderLine {
  const product = MENU.find((item) => item.id === productId)!;
  return { productId, name: product.name, price: product.price, qty };
}

function makeOrder(partial: Partial<Order> & Pick<Order, "number" | "channel" | "kind" | "lines" | "createdAt">): Order {
  const { total, cost } = totalsOf(partial.lines);
  return {
    id: "o" + partial.number + "-" + partial.createdAt,
    status: "entregado",
    table: null,
    note: "",
    clientName: "",
    phone: "",
    address: "",
    payment: "efectivo",
    clientId: null,
    courierId: null,
    total,
    cost,
    deliveredAt: null,
    ...partial
  };
}

function seed(): EmeState {
  const now = new Date();
  const orders: Order[] = [];
  let seedValue = 7;
  const random = () => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  };
  // Historial del mes para que la pestaña "Mes" no arranque vacia.
  for (let day = 1; day < now.getDate(); day++) {
    const count = 5 + Math.floor(random() * 6);
    for (let n = 0; n < count; n++) {
      const lines: OrderLine[] = [];
      const itemsCount = 1 + Math.floor(random() * 3);
      for (let i = 0; i < itemsCount; i++) lines.push(lineOf(MENU[Math.floor(random() * MENU.length)].id, 1 + Math.floor(random() * 2)));
      const channel: Channel = random() < 0.45 ? "mesa" : random() < 0.5 ? "whatsapp" : "mostrador";
      const kind: Kind = channel === "mesa" ? "salon" : random() < 0.7 ? "delivery" : "retiro";
      const created = new Date(now.getFullYear(), now.getMonth(), day, 12 + Math.floor(random() * 10), Math.floor(random() * 60)).toISOString();
      orders.push(
        makeOrder({
          number: 0,
          channel,
          kind,
          lines,
          createdAt: created,
          deliveredAt: created,
          table: channel === "mesa" ? 1 + Math.floor(random() * 8) : null,
          courierId: kind === "delivery" ? 1 + Math.floor(random() * 2) : null
        })
      );
    }
  }
  const t = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60000).toISOString();
  orders.push(
    makeOrder({
      number: 1,
      channel: "whatsapp",
      kind: "delivery",
      status: "aceptado",
      lines: [lineOf("pz-esp", 1), lineOf("bb-coca15", 1)],
      createdAt: t(12),
      clientName: "Carla Méndez",
      phone: "099 123 456",
      address: "Av. Italia 2345 apto 3"
    }),
    makeOrder({
      number: 2,
      channel: "mesa",
      kind: "salon",
      status: "aceptado",
      table: 3,
      lines: [lineOf("hb-doble", 2), lineOf("mi-papas", 1), lineOf("bb-coca", 2)],
      createdAt: t(8)
    }),
    makeOrder({
      number: 3,
      channel: "mostrador",
      kind: "delivery",
      status: "en_camino",
      lines: [lineOf("mi-chivi", 2)],
      createdAt: t(25),
      clientName: "Estudio Rivera",
      address: "Bvar. Artigas 1180",
      payment: "cuenta",
      clientId: 2,
      courierId: 2
    })
  );
  return {
    orders,
    nextNumber: 4,
    couriers: [
      { id: 1, name: "Martín" },
      { id: 2, name: "Lucía" }
    ],
    clients: [
      { id: 1, name: "Almacén Don Pepe", phone: "098 555 111", balance: 4200, payments: [{ date: t(60 * 24 * 6), amount: 3000 }] },
      { id: 2, name: "Estudio Rivera", phone: "094 222 333", balance: 7850 + 1380, payments: [] },
      { id: 3, name: "Familia Gómez", phone: "091 777 888", balance: 0, payments: [{ date: t(60 * 24 * 2), amount: 2600 }] }
    ]
  };
}

function loadLocal(): EmeState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as EmeState;
  } catch {
    // arranca con datos de ejemplo
  }
  return seed();
}

// ---- Sesion unica compartida ----------------------------------------
// El estado completo vive en el backend (GET/PUT /eme/state con numero de
// version). Cada cambio es una funcion pura sobre el estado: si otro
// dispositivo escribio antes, se baja lo ultimo y se reaplica el cambio.
// localStorage queda como copia local por si no hay conexion.
export type SyncStatus = "conectando" | "en-linea" | "sin-conexion";

let state: EmeState = loadLocal();
let serverVersion = 0;
let syncStatus: SyncStatus = "conectando";
let queue: Promise<void> = Promise.resolve();
let pending = 0;
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

function saveLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sin storage: funciona igual
  }
}

type ServerReply = { ok: boolean; version: number; unchanged?: boolean; state: EmeState | null };

async function api(path: string, init?: RequestInit): Promise<ServerReply> {
  const response = await fetch(API_BASE_URL + path, { ...init, headers: { "Content-Type": "application/json" } });
  if (!response.ok) throw new Error("HTTP " + response.status);
  return (await response.json()) as ServerReply;
}

function adopt(reply: ServerReply) {
  if (reply.state) {
    state = reply.state;
    saveLocal();
  }
  serverVersion = reply.version;
  emit();
}

async function pushState(next: EmeState): Promise<ServerReply> {
  return api("/eme/state", { method: "PUT", body: JSON.stringify({ baseVersion: serverVersion, state: next }) });
}

// Aplica el cambio localmente al instante (UI rapida) y lo manda al servidor.
function mutate(change: (current: EmeState) => EmeState) {
  state = change(state);
  saveLocal();
  emit();
  pending++;
  queue = queue.then(async () => {
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const reply = await pushState(state);
        if (reply.ok) {
          serverVersion = reply.version;
          setStatus("en-linea");
          return;
        }
        // Conflicto: otro dispositivo se adelanto. Bajamos lo suyo y reaplicamos.
        if (reply.state) {
          state = change(reply.state);
          serverVersion = reply.version;
          saveLocal();
          emit();
        }
      }
    } catch {
      setStatus("sin-conexion");
    } finally {
      pending--;
    }
  });
}

async function poll() {
  try {
    await queue;
    // Con version 0 el servidor aun esta vacio: se pide completo para poder subir los datos iniciales.
    const reply = await api(serverVersion > 0 ? "/eme/state?since=" + serverVersion : "/eme/state");
    // Si mientras tanto hiciste un cambio, no pisamos tu pantalla con datos viejos.
    if (pending > 0) return;
    if (reply.unchanged) {
      setStatus("en-linea");
      return;
    }
    if (reply.state) {
      adopt(reply);
    } else {
      // Servidor vacio (primera vez): subimos los datos de ejemplo.
      const pushed = await pushState(state);
      if (pushed.ok) serverVersion = pushed.version;
      else if (pushed.state) adopt(pushed);
    }
    setStatus("en-linea");
  } catch {
    setStatus("sin-conexion");
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

export function createOrder(input: NewOrderInput): Order {
  const { total, cost } = totalsOf(input.lines);
  const createdAt = new Date().toISOString();
  let created: Order | null = null;
  mutate((current) => {
    const number = current.nextNumber;
    // Cuenta corriente: usa el cliente elegido o el que coincide por nombre; si no existe, lo crea.
    let clients: AccountClient[] = current.clients;
    let linkedClientId: number | null = null;
    if ((input.payment ?? "efectivo") === "cuenta") {
      const name = (input.clientName ?? "").trim();
      let client =
        input.clientId != null
          ? clients.find((item) => item.id === input.clientId)
          : clients.find((item) => item.name.trim().toLowerCase() === name.toLowerCase());
      if (!client && name) {
        client = { id: Math.max(0, ...clients.map((item) => item.id)) + 1, name, phone: input.phone ?? "", address: input.address ?? "", balance: 0, payments: [] };
        clients = [...clients, client];
      }
      if (client) {
        const linked = client;
        linkedClientId = linked.id;
        clients = clients.map((item) => (item.id === linked.id ? { ...item, balance: item.balance + total } : item));
      }
    }
    const order: Order = {
      id: "o" + number + "-" + createdAt,
      number,
      channel: input.channel,
      kind: input.kind,
      // Lo que levanta la mesa debe aceptarlo la caja; lo que ingresa la caja ya entra aceptado.
      status: input.channel === "mesa" ? "por_aceptar" : "aceptado",
      table: input.table ?? null,
      lines: input.lines,
      note: input.note ?? "",
      clientName: input.clientName ?? "",
      phone: input.phone ?? "",
      address: input.address ?? "",
      payment: input.payment ?? "efectivo",
      clientId: linkedClientId,
      courierId: null,
      total,
      cost,
      createdAt,
      deliveredAt: null
    };
    created = order;
    return { ...current, orders: [...current.orders, order], nextNumber: number + 1, clients };
  });
  const made = created as Order | null;
  if (made) {
    trackActivity(
      "accion",
      made.channel === "mesa"
        ? "Pedido #" + made.number + " de la mesa " + made.table + " enviado a caja ($" + Math.round(made.total) + ")"
        : "Pedido #" + made.number + " ingresado en caja" + (made.clientName ? " (" + made.clientName + ")" : "") + " ($" + Math.round(made.total) + ")"
    );
  }
  return created!;
}

function patchOrder(id: string, patch: Partial<Order>) {
  mutate((current) => ({ ...current, orders: current.orders.map((order) => (order.id === id ? { ...order, ...patch } : order)) }));
}

export function acceptOrder(id: string) {
  trackActivity("accion", "Pedido aceptado en caja");
  patchOrder(id, { status: "aceptado" });
}

export function rejectOrder(id: string) {
  trackActivity("accion", "Pedido rechazado en caja");
  patchOrder(id, { status: "rechazado" });
}

export function assignCourier(id: string, courierId: number) {
  trackActivity("accion", "Repartidor asignado");
  patchOrder(id, { courierId, status: "en_camino" });
}

export function markDelivered(id: string) {
  trackActivity("accion", "Pedido marcado como entregado");
  patchOrder(id, { status: "entregado", deliveredAt: new Date().toISOString() });
}

export function addClient(name: string, phone: string, address: string) {
  trackActivity("accion", "Cliente agregado a cuenta corriente: " + name);
  mutate((current) => ({
    ...current,
    clients: [...current.clients, { id: Math.max(0, ...current.clients.map((item) => item.id)) + 1, name, phone, address, balance: 0, payments: [] }]
  }));
}

export function registerPayment(clientId: number, amount: number) {
  trackActivity("accion", "Pago registrado en cuenta corriente ($" + Math.round(amount) + ")");
  const date = new Date().toISOString();
  mutate((current) => ({
    ...current,
    clients: current.clients.map((client) =>
      client.id === clientId
        ? { ...client, balance: Math.max(0, client.balance - amount), payments: [{ date, amount }, ...client.payments] }
        : client
    )
  }));
}

export function resetDemo() {
  trackActivity("accion", "Demo reiniciada");
  const fresh = seed();
  mutate(() => fresh);
}
