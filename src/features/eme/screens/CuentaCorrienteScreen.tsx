import { useState } from "react";
import { addClient, registerPayment, useEme } from "../eme.store";
import { dateOf, money, timeOf } from "../eme.format";

// Como en Joker: izquierda para agregar clientes, al medio la lista y a la
// derecha el detalle del cliente elegido.
export function CuentaCorrienteScreen() {
  const { clients, orders } = useEme();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [amount, setAmount] = useState("");

  const totalDebt = clients.reduce((sum, client) => sum + client.balance, 0);
  const filtered = clients.filter((client) => client.name.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = clients.find((client) => client.id === selectedId) ?? null;
  const movements = selected ? orders.filter((order) => order.clientId === selected.id && order.status !== "rechazado") : [];

  function submitClient() {
    const name = newName.trim();
    if (!name) return;
    addClient(name, newPhone.trim(), newAddress.trim());
    setNewName("");
    setNewPhone("");
    setNewAddress("");
  }

  function pay() {
    const value = Number(amount);
    if (!selected || !value || value <= 0) return;
    registerPayment(selected.id, value);
    setAmount("");
  }

  return (
    <section>
      <h2>Cuenta corriente</h2>
      <div className="cc-layout">
        <aside className="cc-col">
          <div className="card">
            <h3>Agregar cliente</h3>
            <div className="form">
              <input placeholder="Nombre" value={newName} onChange={(event) => setNewName(event.target.value)} />
              <input placeholder="Teléfono" inputMode="tel" value={newPhone} onChange={(event) => setNewPhone(event.target.value)} />
              <input placeholder="Dirección" value={newAddress} onChange={(event) => setNewAddress(event.target.value)} />
              <button type="button" className="btn primary" onClick={submitClient} disabled={!newName.trim()}>
                + Agregar
              </button>
            </div>
          </div>
          <div className="stat">
            <span>Total que te deben</span>
            <b>{money(totalDebt)}</b>
            <small>{clients.length} clientes</small>
          </div>
        </aside>

        <div className="cc-col">
          <input placeholder="🔎 Buscar cliente…" value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="cc-list">
            {filtered.map((client) => (
              <button key={client.id} type="button" className={client.id === selectedId ? "cc-item on" : "cc-item"} onClick={() => setSelectedId(client.id)}>
                <span>
                  <strong>{client.name}</strong>
                  <small>{client.phone || "Sin teléfono"}</small>
                </span>
                <b className={client.balance > 0 ? "debt" : "ok"}>{client.balance > 0 ? money(client.balance) : "Al día"}</b>
              </button>
            ))}
            {filtered.length === 0 && <p className="empty">No hay clientes con ese nombre.</p>}
          </div>
        </div>

        <div className="cc-col">
          {!selected ? (
            <div className="card empty">Tocá un cliente para ver su detalle.</div>
          ) : (
            <div className="card cc-detail">
              <div className="row between">
                <div>
                  <h3>{selected.name}</h3>
                  <p className="hint">
                    {selected.phone || "Sin teléfono"}
                    {selected.address ? " · " + selected.address : ""}
                  </p>
                </div>
                <b className={selected.balance > 0 ? "debt big" : "ok big"}>{selected.balance > 0 ? "Debe " + money(selected.balance) : "Al día"}</b>
              </div>

              <h4>Pedidos a cuenta</h4>
              {movements.length === 0 && <p className="hint">Todavía no tiene pedidos a cuenta.</p>}
              {movements.map((order) => (
                <div key={order.id} className="cc-move">
                  <div className="cart-row">
                    <span>
                      Pedido #{order.number} · {dateOf(order.createdAt)} {timeOf(order.createdAt)}
                    </span>
                    <b className="debt">+ {money(order.total)}</b>
                  </div>
                  <ul className="order-lines">
                    {order.lines.map((line) => (
                      <li key={line.name}>
                        {line.qty} × {line.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <h4>Pagos</h4>
              {selected.payments.length === 0 && <p className="hint">Sin pagos registrados.</p>}
              {selected.payments.map((payment) => (
                <div key={payment.date} className="cart-row">
                  <span>
                    Pago · {dateOf(payment.date)} {timeOf(payment.date)}
                  </span>
                  <b className="ok">− {money(payment.amount)}</b>
                </div>
              ))}

              <div className="row">
                <input placeholder="Monto que pagó" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
                <button type="button" className="btn primary" onClick={pay}>
                  Registrar pago
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
