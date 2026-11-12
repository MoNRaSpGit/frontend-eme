import { useState } from "react";
import { acceptOrder, rejectOrder } from "../eme.store";
import { money, timeOf } from "../eme.format";
import type { Order } from "../eme.types";

// Avisos de pedidos de mesa: chiquitos, no bloquean la pantalla y se apilan
// (el mas viejo arriba). Al tocar uno se abre su detalle para aceptar/rechazar.
export function IncomingOrders({ orders }: { orders: Order[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = orders.find((order) => order.id === openId) ?? null;

  return (
    <>
      <div className="incoming-stack">
        {orders.map((order) => (
          <button key={order.id} type="button" className="incoming-toast" onClick={() => setOpenId(order.id)}>
            <span className="incoming-bell">🔔</span>
            <span className="incoming-text">
              <b>Mesa {order.table}</b>
              <small>
                Pedido #{order.number} · {timeOf(order.createdAt)} · {money(order.total)}
              </small>
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpenId(null)}>
          <div className="modal incoming" onClick={(event) => event.stopPropagation()}>
            <div className="row between">
              <p className="incoming-tag">Pedido de mesa</p>
              <button type="button" className="btn small" onClick={() => setOpenId(null)}>
                ✕
              </button>
            </div>
            <h2>
              Mesa {open.table} · Pedido #{open.number}
            </h2>
            <p className="hint">Enviado a las {timeOf(open.createdAt)}</p>
            <ul className="incoming-list">
              {open.lines.map((line) => (
                <li key={line.productId}>
                  <b>{line.qty} ×</b> {line.name}
                </li>
              ))}
            </ul>
            {open.note && <p className="note">📝 {open.note}</p>}
            <div className="cart-total">
              <span>Total</span>
              <b>{money(open.total)}</b>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  acceptOrder(open.id);
                  setOpenId(null);
                }}
              >
                ✓ Aceptar
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  rejectOrder(open.id);
                  setOpenId(null);
                }}
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
