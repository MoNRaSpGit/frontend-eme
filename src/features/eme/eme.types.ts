export type Role = "mesas" | "caja";
export type Channel = "mesa" | "mostrador" | "whatsapp";
export type Kind = "salon" | "delivery" | "retiro";
export type Status = "por_aceptar" | "aceptado" | "en_camino" | "entregado" | "rechazado";
export type Payment = "efectivo" | "tarjeta" | "cuenta";

export type Product = { id: string; category: string; name: string; price: number; cost: number; emoji: string };
export type OrderLine = { productId: string; name: string; price: number; qty: number };

export type Order = {
  id: string;
  number: number;
  channel: Channel;
  kind: Kind;
  status: Status;
  table: number | null;
  lines: OrderLine[];
  note: string;
  clientName: string;
  phone: string;
  address: string;
  payment: Payment;
  clientId: number | null;
  courierId: number | null;
  total: number;
  cost: number;
  createdAt: string;
  deliveredAt: string | null;
};

export type Courier = { id: number; name: string };
export type AccountClient = { id: number; name: string; phone: string; balance: number; payments: { date: string; amount: number }[] };

export type EmeState = {
  orders: Order[];
  nextNumber: number;
  clients: AccountClient[];
  couriers: Courier[];
};
