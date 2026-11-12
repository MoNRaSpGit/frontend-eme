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
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const totalDebt = clients.reduce((sum, client) => sum + client.balance, 0);
  const filtered = clients.filter((client) => client.name.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = clients.find((client) => client.id === selectedId) ?? null;
  // Una sola lista: pedidos (suman) y pagos (restan), lo mas nuevo arriba.
  const movements = selected
    ? [
        ...orders
          .filter((order) => order.clientId === selected.id && order.status !== "rechazado")
          .map((order) => ({ kind: "pedido" as const, date: order.createdAt, order })),
        ...selected.payments.map((payment) => ({ kind: "pago" as const, date: payment.date, amount: payment.amount }))
      ].sort((a, b) => b.date.localeCompare(a.date))
    : [];

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
              <div className="cc-head">
                <h3>{selected.name}</h3>
                <b className={selected.balance > 0 ? "debt cc-balance" : "ok cc-balance"}>{selected.balance > 0 ? money(selected.balance) : "Al día"}</b>
                {selected.balance > 0 && <span className="hint">es lo que debe</span>}
              </div>

              <div className="cc-moves">
                {movements.length === 0 && <p className="hint">Sin movimientos todavía.</p>}
                {movements.map((move) =>
                  move.kind === "pedido" ? (
                    <div key={move.order.id} className="cc-row">
                      <button type="button" onClick={() => setOpenOrderId(openOrderId === move.order.id ? null : move.order.id)}>
                        <span>
                          Pedido #{move.order.number} <small>{dateOf(move.date)}</small>
                        </span>
                        <b className="debt">{money(move.order.total)}</b>
                      </button>
                      {openOrderId === move.order.id && (
                        <p className="hint">{move.order.lines.map((line) => line.qty + " × " + line.name).join(" · ")}</p>
                      )}
                    </div>
                  ) : (
                    <div key={move.date} className="cc-row">
                      <button type="button" disabled>
                        <span>
                          Pago <small>{dateOf(move.date)}</small>
                        </span>
                        <b className="ok">− {money(move.amount)}</b>
                      </button>
                    </div>
                  )
                )}
              </div>

              <div className="row">
                <input placeholder="Monto que pagó" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
                <button type="button" className="btn primary" onClick={pay}>
                  Pagó
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
