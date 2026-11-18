export type Role = "mesas" | "caja";
export type Channel = "mesa" | "mostrador" | "whatsapp";
export type Kind = "salon" | "delivery" | "retiro";
export type Status = "por_aceptar" | "aceptado" | "en_camino" | "entregado" | "rechazado";
export type Payment = "efectivo" | "tarjeta" | "cuenta";

// ingredients (18/11/2026): opcional; si no tiene, no se muestra nada.
export type Product = { id: string; category: string; name: string; price: number; cost: number; emoji: string; ingredients?: string[] };
// "name" ya incluye los extras elegidos (ej: "Pizza muzzarella + panceta") y "price" los suma.
// baseName = nombre del producto solo (para la comanda); removed = ingredientes
// que se destildaron al tomar el pedido ("SIN lechuga") (18/11/2026).
export type OrderLine = { productId: string; name: string; price: number; qty: number; extras?: string[]; baseName?: string; removed?: string[] };

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
export type AccountClient = { id: number; name: string; phone: string; address?: string; balance: number; payments: { date: string; amount: number }[] };

export type EmeState = {
  orders: Order[];
  nextNumber: number;
  clients: AccountClient[];
  couriers: Courier[];
  // Productos y categorias editables desde "Productos" (18/11/2026). Si todavia
  // no se edito nada, se usa el menu de ejemplo (eme.menu.ts).
  products?: Product[];
  categories?: string[];
};
