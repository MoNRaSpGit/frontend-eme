import { useState } from "react";
import { TicketModal } from "../components/TicketModal";
import { assignCourier, markDelivered, useEme } from "../eme.store";
import { isSameDay, money, timeOf } from "../eme.format";
import type { Order } from "../eme.types";

const CHANNEL_LABEL = { mesa: "Mesa", mostrador: "Mostrador", whatsapp: "WhatsApp" } as const;

export function PedidosScreen() {
  const { orders, couriers } = useEme();
  const [ticket, setTicket] = useState<Order | null>(null);

  const today = orders.filter((order) => isSameDay(order.createdAt) && order.status !== "rechazado" && order.status !== "por_aceptar");
  const preparing = today.filter((order) => order.status === "aceptado");
  const onTheWay = today.filter((order) => order.status === "en_camino");
  const done = today.filter((order) => order.status === "entregado").reverse();

  function card(order: Order) {
    const courier = couriers.find((item) => item.id === order.courierId);
    return (
      <article key={order.id} className="order">
        <div className="row between">
          <h3>
            Pedido #{order.number}
            {order.table ? " · Mesa " + order.table : ""}
          </h3>
          <span className={"badge " + order.channel}>{CHANNEL_LABEL[order.channel]}</span>
        </div>
        <p className="hint">
          {timeOf(order.createdAt)}
          {order.clientName ? " · " + order.clientName : ""}
          {order.kind === "retiro" ? " · Retira en local" : ""}
        </p>
        {order.address && <p className="address">📍 {order.address}</p>}
        <ul className="order-lines">
          {order.lines.map((line) => (
            <li key={line.productId}>
              {line.qty} × {line.name}
            </li>
          ))}
        </ul>
        {order.note && <p className="note">📝 {order.note}</p>}
        <div className="row between">
          <b>{money(order.total)}</b>
          <span className="hint">{order.payment === "cuenta" ? "Cuenta corriente" : order.payment === "tarjeta" ? "Tarjeta" : "Efectivo"}</span>
        </div>

        {order.status === "aceptado" && order.kind === "delivery" && (
          <div className="couriers">
            <span className="hint">Mandar con:</span>
            <div className="row wrap">
              {couriers.map((item) => (
                <button key={item.id} type="button" className="btn courier" onClick={() => assignCourier(order.id, item.id)}>
                  🛵 {item.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {order.status === "aceptado" && order.kind !== "delivery" && (
          <button type="button" className="btn primary wide" onClick={() => markDelivered(order.id)}>
            {order.kind === "salon" ? "Cobrar y cerrar mesa" : "Entregado al cliente"}
          </button>
        )}
        {order.status === "en_camino" && (
          <div className="row between">
            <span className="route">🛵 En camino con {courier?.name}</span>
            <button type="button" className="btn primary small" onClick={() => markDelivered(order.id)}>
              Marcar entregado
            </button>
          </div>
        )}
        {order.status === "entregado" && courier && <p className="hint">Entregado por {courier.name}</p>}
        <button type="button" className="btn small" onClick={() => setTicket(order)}>
          🧾 Ticket
        </button>
      </article>
    );
  }

  return (
    <section>
      <h2>En preparación ({preparing.length})</h2>
      <div className="grid">{preparing.map(card)}</div>
      {preparing.length === 0 && <p className="empty">No hay pedidos en preparación.</p>}

      <h2>En camino ({onTheWay.length})</h2>
      <div className="grid">{onTheWay.map(card)}</div>
      {onTheWay.length === 0 && <p className="empty">Ningún pedido en la calle.</p>}

      <h2>Entregados hoy ({done.length})</h2>
      <div className="grid">{done.map(card)}</div>

      {ticket && <TicketModal order={ticket} couriers={couriers} onClose={() => setTicket(null)} />}
    </section>
  );
}
