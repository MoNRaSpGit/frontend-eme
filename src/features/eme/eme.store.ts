import { useSyncExternalStore } from "react";
import { MENU } from "./eme.menu";
import type { AccountClient, Channel, EmeState, Kind, Order, OrderLine, Payment } from "./eme.types";

// Demo sin backend: el estado vive en localStorage y se sincroniza entre
// pestañas del mismo navegador (asi se prueba Mesas en una y Caja en otra).
const KEY = "eme-demo-state-v2";

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

function load(): EmeState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as EmeState;
  } catch {
    // arranca con datos de ejemplo
  }
  return seed();
}

let state: EmeState = load();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(next: EmeState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sin storage: funciona igual en esta pestaña
  }
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) {
      state = load();
      emit();
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEme(): EmeState {
  return useSyncExternalStore(subscribe, () => state);
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
  const number = state.nextNumber;
  const createdAt = new Date().toISOString();
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
    clientId: input.clientId ?? null,
    courierId: null,
    total,
    cost,
    createdAt,
    deliveredAt: null
  };
  const clients: AccountClient[] =
    order.payment === "cuenta" && order.clientId !== null
      ? state.clients.map((client) => (client.id === order.clientId ? { ...client, balance: client.balance + total } : client))
      : state.clients;
  commit({ ...state, orders: [...state.orders, order], nextNumber: number + 1, clients });
  return order;
}

function patchOrder(id: string, patch: Partial<Order>) {
  commit({ ...state, orders: state.orders.map((order) => (order.id === id ? { ...order, ...patch } : order)) });
}

export function acceptOrder(id: string) {
  patchOrder(id, { status: "aceptado" });
}

export function rejectOrder(id: string) {
  patchOrder(id, { status: "rechazado" });
}

export function assignCourier(id: string, courierId: number) {
  patchOrder(id, { courierId, status: "en_camino" });
}

export function markDelivered(id: string) {
  patchOrder(id, { status: "entregado", deliveredAt: new Date().toISOString() });
}

export function registerPayment(clientId: number, amount: number) {
  commit({
    ...state,
    clients: state.clients.map((client) =>
      client.id === clientId
        ? { ...client, balance: Math.max(0, client.balance - amount), payments: [{ date: new Date().toISOString(), amount }, ...client.payments] }
        : client
    )
  });
}

export function resetDemo() {
  commit(seed());
}
