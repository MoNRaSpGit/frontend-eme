import { acceptOrder, rejectOrder } from "../eme.store";
import { money, timeOf } from "../eme.format";
import type { Order } from "../eme.types";

// Pop-up que le salta a la caja cuando una mesa levanta un pedido.
export function IncomingOrderModal({ order, pending }: { order: Order; pending: number }) {
  return (
    <div className="modal-backdrop">
      <div className="modal incoming">
        <p className="incoming-tag">🔔 Pedido nuevo de mesa{pending > 1 ? " · " + pending + " pendientes" : ""}</p>
        <h2>
          Mesa {order.table} · Pedido #{order.number}
        </h2>
        <p className="hint">Enviado a las {timeOf(order.createdAt)}</p>
        <ul className="incoming-list">
          {order.lines.map((line) => (
            <li key={line.productId}>
              <b>{line.qty} ×</b> {line.name}
            </li>
          ))}
        </ul>
        {order.note && <p className="note">📝 {order.note}</p>}
        <div className="cart-total">
          <span>Total</span>
          <b>{money(order.total)}</b>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn primary" onClick={() => acceptOrder(order.id)}>
            ✓ Aceptar
          </button>
          <button type="button" className="btn danger" onClick={() => rejectOrder(order.id)}>
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}
