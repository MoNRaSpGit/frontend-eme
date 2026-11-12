import { useState } from "react";
import { registerPayment, useEme } from "../eme.store";
import { dateOf, money } from "../eme.format";

export function CuentaCorrienteScreen() {
  const { clients, orders } = useEme();
  const [openId, setOpenId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");

  const totalDebt = clients.reduce((sum, client) => sum + client.balance, 0);

  function pay(clientId: number) {
    const value = Number(amount);
    if (!value || value <= 0) return;
    registerPayment(clientId, value);
    setAmount("");
  }

  return (
    <section>
      <h2>Cuenta corriente</h2>
      <div className="stat-row">
        <div className="stat">
          <span>Total que te deben</span>
          <b>{money(totalDebt)}</b>
        </div>
        <div className="stat">
          <span>Clientes</span>
          <b>{clients.length}</b>
        </div>
      </div>

      <div className="grid">
        {clients.map((client) => {
          const movements = orders.filter((order) => order.clientId === client.id);
          const open = openId === client.id;
          return (
            <article key={client.id} className="order">
              <div className="row between">
                <div>
                  <h3>{client.name}</h3>
                  <p className="hint">{client.phone}</p>
                </div>
                <b className={client.balance > 0 ? "debt" : "ok"}>{client.balance > 0 ? "Debe " + money(client.balance) : "Al día"}</b>
              </div>
              <button type="button" className="btn small" onClick={() => setOpenId(open ? null : client.id)}>
                {open ? "Ocultar" : "Ver movimientos"}
              </button>
              {open && (
                <div className="movements">
                  {movements.map((order) => (
                    <div key={order.id} className="cart-row">
                      <span>
                        Pedido #{order.number} · {dateOf(order.createdAt)}
                      </span>
                      <b className="debt">+ {money(order.total)}</b>
                    </div>
                  ))}
                  {client.payments.map((payment) => (
                    <div key={payment.date} className="cart-row">
                      <span>Pago · {dateOf(payment.date)}</span>
                      <b className="ok">− {money(payment.amount)}</b>
                    </div>
                  ))}
                  {movements.length === 0 && client.payments.length === 0 && <p className="hint">Sin movimientos.</p>}
                  <div className="row">
                    <input placeholder="Monto que pagó" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
                    <button type="button" className="btn primary" onClick={() => pay(client.id)}>
                      Registrar pago
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
