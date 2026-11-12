import { useState } from "react";
import { dateOf, money, timeOf } from "../eme.format";
import type { Courier, Order } from "../eme.types";

type Props = { order: Order; couriers: Courier[]; onClose: () => void };

const KIND_LABEL = { salon: "Salón", delivery: "Delivery", retiro: "Retiro" } as const;
const PAYMENT_LABEL = { efectivo: "Efectivo", tarjeta: "Tarjeta", cuenta: "Cuenta corriente" } as const;

export function TicketModal({ order, couriers, onClose }: Props) {
  // Impresion ficticia (demo): solo confirma, no manda nada a imprimir.
  const [printed, setPrinted] = useState(false);
  const courier = couriers.find((item) => item.id === order.courierId);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="ticket">
          <h2>EME RESTAURANTE</h2>
          <p className="center">
            {dateOf(order.createdAt)} {timeOf(order.createdAt)}
          </p>
          <hr />
          <p>
            <b>Pedido #{order.number}</b> · {KIND_LABEL[order.kind]}
            {order.table ? " · Mesa " + order.table : ""}
          </p>
          {order.clientName && <p>Cliente: {order.clientName}</p>}
          {order.address && <p>Dirección: {order.address}</p>}
          {order.phone && <p>Tel: {order.phone}</p>}
          {courier && <p>Repartidor: {courier.name}</p>}
          <hr />
          {order.lines.map((line) => (
            <div key={line.name} className="ticket-row">
              <span>
                {line.qty} x {line.name}
              </span>
              <span>{money(line.price * line.qty)}</span>
            </div>
          ))}
          {order.note && <p>Nota: {order.note}</p>}
          <hr />
          <div className="ticket-row big">
            <span>TOTAL</span>
            <span>{money(order.total)}</span>
          </div>
          <p>Pago: {PAYMENT_LABEL[order.payment]}</p>
          <p className="center">¡Gracias por su compra!</p>
        </div>
        <div className="modal-actions no-print">
          <button type="button" className={printed ? "btn printed" : "btn primary"} disabled={printed} onClick={() => setPrinted(true)}>
            {printed ? "✓ Impresión confirmada" : "Imprimir"}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
