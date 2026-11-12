import { useState } from "react";
import { TicketModal } from "../components/TicketModal";
import { assignCourier, markDelivered, useEme } from "../eme.store";
import { isSameDay, money, timeOf } from "../eme.format";
import type { Order, Status } from "../eme.types";

// Ganancia de la demo: 30% por defecto; con doble clic se cambia al porcentaje que quiera.
const PROFIT_KEY = "eme-profit-rate";

function loadProfitPercent(): number {
  try {
    const value = Number(localStorage.getItem(PROFIT_KEY));
    if (value > 0 && value <= 100) return value;
  } catch {
    // usa el valor por defecto
  }
  return 30;
}

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
  const [profitPercent, setProfitPercent] = useState<number>(loadProfitPercent);
  const [editingProfit, setEditingProfit] = useState(false);
  const [profitDraft, setProfitDraft] = useState("");

  // Lo mas nuevo arriba; los pedidos viejos van quedando abajo.
  const today = orders
    .filter((order) => isSameDay(order.createdAt) && order.status !== "rechazado" && order.status !== "por_aceptar")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.number - a.number);
  const income = today.reduce((sum, order) => sum + order.total, 0);
  const profit = income * (profitPercent / 100);

  function startEditProfit() {
    setProfitDraft(String(profitPercent));
    setEditingProfit(true);
  }

  function saveProfit() {
    const value = Number(profitDraft.replace(",", "."));
    if (value > 0 && value <= 100) {
      setProfitPercent(value);
      try {
        localStorage.setItem(PROFIT_KEY, String(value));
      } catch {
        // sin storage: queda en esta pantalla
      }
    }
    setEditingProfit(false);
  }

  return (
    <section>
      <h2>Pedidos de hoy</h2>

      <div className="panel-top">
        <div className="stat hero">
          <span>Plata que va entrando</span>
          <b>{money(income)}</b>
          <small>{today.length} pedidos</small>
        </div>
        <div className="stat editable" onDoubleClick={startEditProfit} title="Doble clic para cambiar el porcentaje">
          <span>
            Ganancia (
            {editingProfit ? (
              <input
                className="percent-input"
                autoFocus
                inputMode="decimal"
                value={profitDraft}
                onChange={(event) => setProfitDraft(event.target.value)}
                onBlur={saveProfit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveProfit();
                  if (event.key === "Escape") setEditingProfit(false);
                }}
              />
            ) : (
              profitPercent
            )}
            %)
          </span>
          <b className="ok">{money(profit)}</b>
          <small>doble clic para cambiar el %</small>
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
                      🧾 Ticket
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {ticket && <TicketModal order={ticket} couriers={couriers} onClose={() => setTicket(null)} />}
    </section>
  );
}
