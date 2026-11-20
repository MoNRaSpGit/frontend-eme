import { useState } from "react";
import { PrintModal } from "../components/PrintModal";
import { EditOrderModal } from "../components/EditOrderModal";
import { addRegisterExpense, assignCourier, cancelOrder, closeRegister, deleteRegisterExpense, markDelivered, setOpeningAmount, setOrderKind, useEme } from "../eme.store";
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
const PAYMENT_LABEL = { efectivo: "Efectivo", tarjeta: "POS", cuenta: "Cuenta corriente", transferencia: "Transferencia" } as const;

// Panel de control: arriba lo que entra y la ganancia; abajo los movimientos
// (pedido 1, 2, 3…) comprimidos. Al tocar uno se abre todo el detalle.
export function PedidosScreen() {
  const { orders, couriers, register } = useEme();
  const [openId, setOpenId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Order | null>(null);
  const [editing, setEditing] = useState<Order | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [editingOpening, setEditingOpening] = useState(false);
  const [openingDraft, setOpeningDraft] = useState("");
  const [showExpenses, setShowExpenses] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [showClose, setShowClose] = useState(false);
  const [closing, setClosing] = useState(false);

  // Caja (19/11/2026): Pedidos muestra el turno de caja abierto (desde que se
  // abrio: a las 3 am o despues del ultimo cierre manual).
  const opening = register?.openingAmount ?? 0;
  const expenses = register?.expenses ?? [];
  const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const inShift = (iso: string) => (register ? iso >= register.openedAt : isSameDay(iso));

  function startOpening() {
    setOpeningDraft(opening ? String(opening) : "");
    setEditingOpening(true);
  }
  function saveOpening() {
    setEditingOpening(false);
    const value = Number(openingDraft || 0);
    if (Number.isFinite(value) && value >= 0 && value !== opening) setOpeningAmount(value);
  }
  function saveExpense() {
    const amount = Number(expenseAmount);
    if (!expenseDesc.trim() || !amount) return;
    addRegisterExpense(expenseDesc.trim(), amount);
    setExpenseDesc("");
    setExpenseAmount("");
  }

  // Lo mas nuevo arriba; los pedidos viejos van quedando abajo.
  const today = orders
    .filter((order) => inShift(order.createdAt) && order.status !== "rechazado" && order.status !== "por_aceptar")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.number - a.number);
  const income = today.reduce((sum, order) => sum + order.total, 0);
  // 19/11/2026: ganancia REAL = venta - costo de cada producto vendido (el
  // costo se guarda en el pedido al ingresarlo). Ya no es un porcentaje fijo.
  const profit = today.reduce((sum, order) => sum + (order.total - (order.cost ?? 0)), 0);
  const cashSales = today.filter((order) => order.payment === "efectivo").reduce((sum, order) => sum + order.total, 0);
  const cardSales = today.filter((order) => order.payment === "tarjeta").reduce((sum, order) => sum + order.total, 0);
  const transferSales = today.filter((order) => order.payment === "transferencia").reduce((sum, order) => sum + order.total, 0);
  const cashExpected = opening + cashSales - expensesTotal;

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
        {/* Caja (19/11/2026): caja inicial y gastos del turno. */}
        <button type="button" className="stat stat-button" onClick={startOpening}>
          <span>Caja inicial ✎</span>
          {editingOpening ? (
            <input
              className="stat-input"
              autoFocus
              inputMode="numeric"
              value={openingDraft}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setOpeningDraft(event.target.value.replace(/[^\d]/g, ""))}
              onBlur={saveOpening}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveOpening();
                if (event.key === "Escape") setEditingOpening(false);
              }}
            />
          ) : (
            <b>{money(opening)}</b>
          )}
          <small>con la que se abre la caja</small>
        </button>
        <button type="button" className="stat stat-button" onClick={() => setShowExpenses((value) => !value)}>
          <span>Gastos {showExpenses ? "▴" : "▾"}</span>
          <b className="debt">{money(expensesTotal)}</b>
          <small>{expenses.length} gastos · tocá para ver</small>
        </button>
      </div>

      {showExpenses && (
        <div className="card expenses">
          {expenses.length === 0 && <p className="hint">Sin gastos en este turno.</p>}
          {expenses.map((expense) => (
            <div key={expense.id} className="row between">
              <span>
                {expense.description} <small className="hint">{timeOf(expense.createdAt)}</small>
              </span>
              <span className="row">
                <b>{money(expense.amount)}</b>
                <button type="button" className="btn small" onClick={() => deleteRegisterExpense(expense.id)} aria-label="Borrar gasto">
                  ✕
                </button>
              </span>
            </div>
          ))}
          <div className="extra-cost">
            <input placeholder="En qué (ej: hielo)" autoComplete="off" value={expenseDesc} onChange={(event) => setExpenseDesc(event.target.value)} />
            <input placeholder="Monto" inputMode="numeric" autoComplete="off" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value.replace(/[^\d]/g, ""))} />
            <div className="row">
              <button type="button" className="btn primary small" onClick={saveExpense} disabled={!expenseDesc.trim() || !Number(expenseAmount)}>
                + Agregar gasto
              </button>
            </div>
          </div>
        </div>
      )}

      <button type="button" className="btn wide close-register" onClick={() => setShowClose(true)}>
        🔒 Cierre de caja
      </button>
      <p className="hint">Si no se cierra a mano, la caja se cierra sola a las 3 de la mañana.</p>

      {showClose && (
        <div className="modal-backdrop" onClick={() => setShowClose(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Cierre de caja</h2>
            <div className="close-summary">
              <div className="row between"><span>Caja inicial</span><b>{money(opening)}</b></div>
              <div className="row between"><span>Ventas en efectivo</span><b>{money(cashSales)}</b></div>
              <div className="row between"><span>Ventas con POS</span><b>{money(cardSales)}</b></div>
              <div className="row between"><span>Ventas por transferencia</span><b>{money(transferSales)}</b></div>
              <div className="row between"><span>Gastos</span><b className="debt">− {money(expensesTotal)}</b></div>
              <div className="row between total-line"><span>Efectivo que tiene que haber</span><b>{money(cashExpected)}</b></div>
              <div className="row between"><span>Total vendido ({today.length} pedidos)</span><b>{money(income)}</b></div>
              <div className="row between"><span>Ganancia</span><b className="ok">{money(profit)}</b></div>
            </div>
            <p className="hint">Al cerrar, Pedidos arranca de cero (los pedidos quedan guardados en Mes).</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn primary"
                disabled={closing}
                onClick={async () => {
                  setClosing(true);
                  const ok = await closeRegister();
                  setClosing(false);
                  if (ok) setShowClose(false);
                }}
              >
                {closing ? "Cerrando…" : "Cerrar caja"}
              </button>
              <button type="button" className="btn" onClick={() => setShowClose(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                      <li key={line.name + (line.note ?? "")}>
                        {line.qty} × {line.name} <span className="hint">({money(line.price * line.qty)})</span>
                        {line.note ? <div className="cart-note">📝 {line.note}</div> : null}
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
                    <span className="row">
                      <button type="button" className="btn small" onClick={() => setEditing(order)}>
                        ✎ Editar
                      </button>
                      <button type="button" className="btn small" onClick={() => setTicket(order)}>
                        🖨 Reimprimir
                      </button>
                    </span>
                  </div>
                  {/* Anular (20/11/2026): el pedido deja de sumar en caja y en Mes. */}
                  {confirmCancel === order.id ? (
                    <div className="row between">
                      <span className="hint">¿Anular el pedido #{order.number}?</span>
                      <span className="row">
                        <button type="button" className="btn small danger" onClick={() => { cancelOrder(order.id); setConfirmCancel(null); setOpenId(null); }}>
                          Sí, anular
                        </button>
                        <button type="button" className="btn small" onClick={() => setConfirmCancel(null)}>
                          No
                        </button>
                      </span>
                    </div>
                  ) : (
                    <button type="button" className="link-danger" onClick={() => setConfirmCancel(order.id)}>
                      Anular pedido
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {ticket && <PrintModal order={ticket} autoPrint={false} onClose={() => setTicket(null)} />}
      {editing && <EditOrderModal order={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
