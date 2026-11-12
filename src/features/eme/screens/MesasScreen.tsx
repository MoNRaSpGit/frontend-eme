import { useState } from "react";
import { ProductPicker } from "../components/ProductPicker";
import { SyncBadge } from "../components/SyncBadge";
import { createOrder, useEme } from "../eme.store";
import type { OrderLine } from "../eme.types";

const TABLES = [1, 2, 3, 4, 5, 6, 7, 8];

// Rol "Mesas": solo levanta el pedido de la mesa y lo manda a caja.
export function MesasScreen({ onLogout }: { onLogout: () => void }) {
  const { orders } = useEme();
  const [table, setTable] = useState<number | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  function statusOf(tableNumber: number) {
    const active = orders.filter((order) => order.table === tableNumber && order.status !== "entregado" && order.status !== "rechazado");
    if (active.some((order) => order.status === "por_aceptar")) return "esperando";
    if (active.length > 0) return "ocupada";
    return "libre";
  }

  function send() {
    if (table === null || lines.length === 0) return;
    const order = createOrder({ channel: "mesa", kind: "salon", table, lines, note });
    setSent("Pedido #" + order.number + " de la mesa " + table + " enviado a caja ✓");
    setTable(null);
    setLines([]);
    setNote("");
    window.setTimeout(() => setSent(null), 3500);
  }

  return (
    <div className="shell narrow">
      <header className="top">
        <div className="brand">
          <span className="brand-mark">🍽</span>
          <div>
            <h1>Mesas</h1>
            <p>Tomar pedido</p>
          </div>
        </div>
        <div className="row">
          <SyncBadge />
        <button type="button" className="btn small" onClick={onLogout}>
          Salir
        </button>
        </div>
      </header>

      {sent && <div className="toast">{sent}</div>}

      {table === null ? (
        <section>
          <h2>Elegí la mesa</h2>
          <div className="tables">
            {TABLES.map((number) => {
              const status = statusOf(number);
              return (
                <button key={number} type="button" className={"table " + status} onClick={() => setTable(number)}>
                  <b>{number}</b>
                  <span>{status === "libre" ? "Libre" : status === "esperando" ? "Esperando caja" : "Con pedido"}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section>
          <div className="row between">
            <h2>Mesa {table}</h2>
            <button type="button" className="btn small" onClick={() => { setTable(null); setLines([]); setNote(""); }}>
              ← Cambiar mesa
            </button>
          </div>
          <ProductPicker lines={lines} onChange={setLines} />
          <textarea className="note-input" placeholder="Nota para cocina (sin cebolla, bien cocida…)" value={note} onChange={(event) => setNote(event.target.value)} />
          <button type="button" className="btn primary wide" disabled={lines.length === 0} onClick={send}>
            Enviar a caja
          </button>
        </section>
      )}
    </div>
  );
}
