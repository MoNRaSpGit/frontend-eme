import { useState } from "react";
import { PrintModal } from "../components/PrintModal";
import { assignCourier, markDelivered, setOrderKind, useEme } from "../eme.store";
import { isSameDay, money, timeOf } from "../eme.format";
import type { Order, Status } from "../eme.types";


const CHANNEL_LABEL = { mesa: "Mesa", mostrador: "Mostrador", whatsapp: "WhatsApp" } as const;
const STATUS_LABEL: Record<Status, string> = {
  por_aceptar: "Por aceptar",
  aceptado: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado",
  rechazado: "Rechazado"
};
const PAYMENT_LABEL = { efectivo: "Efectivo", tarjeta: "Tarjeta", cuenta: "Cuenta corriente" } as const;

// Panel de control: arriba lo que entra y la ganancia; abajo los movimientos
// (pedido 1, 2, 3…) comprimidos. Al tocar uno se abre todo el detalle.
export function PedidosScreen() {
  const { orders, couriers } = useEme();
  const [openId, setOpenId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Order | null>(null);

  // Lo mas nuevo arriba; los pedidos viejos van quedando abajo.
  const today = orders
    .filter((order) => isSameDay(order.createdAt) && order.status !== "rechazado" && order.status !== "por_aceptar")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.number - a.number);
  const income = today.reduce((sum, order) => sum + order.total, 0);
  // 19/11/2026: ganancia REAL = venta - costo de cada producto vendido (el
  // costo se guarda en el pedido al ingresarlo). Ya no es un porcentaje fijo.
  const profit = today.reduce((sum, order) => sum + (order.total - (order.cost ?? 0)), 0);

  return (
    <section>
      <h2>Pedidos de hoy</h2>

      <div className="panel-top">
        <div className="stat hero">
          <span>Plata que va entrando</span>
          <b>{money(income)}</b>
          <small>{today.length} pedidos</small>
        </div>
        <div className="stat">
          <span>Ganancia</span>
          <b className="ok">{money(profit)}</b>
          <small>según lo que gana cada producto</small>
        </div>
      </div>

      <h3 className="moves-title">Movimientos</h3>
      <div className="moves">
        {today.length === 0 && <p className="empty">Todavía no hay pedidos hoy.</p>}
        {today.map((order) => {
          const open = openId === order.id;
          const courier = couriers.find((item) => item.id === order.courierId);
          return (
            <div key={order.id} className={open ? "move open" : "move"}>
              <button type="button" className="move-head" onClick={() => setOpenId(open ? null : order.id)}>
                <b className="move-num">Pedido #{order.number}</b>
                <span className="move-who">{order.table ? "Mesa " + order.table : order.clientName || CHANNEL_LABEL[order.channel]}</span>
                <span className="move-time">{timeOf(order.createdAt)}</span>
                <span className={"status " + order.status}>{STATUS_LABEL[order.status]}</span>
                <b className="move-total">{money(order.total)}</b>
                <span className="move-arrow">{open ? "▴" : "▾"}</span>
              </button>

              {open && (
                <div className="move-body">
                  <p className="hint">
                    {CHANNEL_LABEL[order.channel]} · {order.kind === "delivery" ? "Delivery" : order.kind === "retiro" ? "Retira en local" : "Salón"} ·{" "}
                    {PAYMENT_LABEL[order.payment]}
                  </p>
                  {order.clientName && (
                    <p>
                      <b>{order.clientName}</b>
                      {order.phone ? " · " + order.phone : ""}
                    </p>
                  )}
                  {order.address && <p className="address">📍 {order.address}</p>}
                  <ul className="order-lines">
                    {order.lines.map((line) => (
                      <li key={line.name}>
                        {line.qty} × {line.name} <span className="hint">({money(line.price * line.qty)})</span>
                      </li>
                    ))}
                  </ul>
                  {order.note && <p className="note">📝 {order.note}</p>}

                  {/* 19/11/2026: elegir mostrador o delivery mientras se prepara. */}
                  {order.status === "aceptado" && order.kind !== "salon" && (
                    // Un solo botoncito: por defecto es mostrador; tocarlo lo pasa a delivery (y otra vez lo vuelve).
                    <button
                      type="button"
                      className={order.kind === "delivery" ? "kind-toggle on" : "kind-toggle"}
                      onClick={() => setOrderKind(order.id, order.kind === "delivery" ? "retiro" : "delivery")}
                    >
                      🛵 Delivery{order.kind === "delivery" ? " ✓" : ""}
                    </button>
                  )}
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
                    <button type="button" className="btn primary" onClick={() => markDelivered(order.id)}>
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

                  <div className="row between">
                    <b>Total {money(order.total)}</b>
                    <button type="button" className="btn small" onClick={() => setTicket(order)}>
                      🖨 Reimprimir
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {ticket && <PrintModal order={ticket} autoPrint={false} onClose={() => setTicket(null)} />}
    </section>
  );
}
