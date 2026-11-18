import { useState } from "react";
import { ProductPicker } from "../components/ProductPicker";
import { PrintModal } from "../components/PrintModal";
import { createOrder, useEme } from "../eme.store";
import type { Order, OrderLine, Payment } from "../eme.types";

// La caja ingresa el pedido que llega por WhatsApp o en el mostrador.
export function NuevoPedidoScreen({ onCreated }: { onCreated: () => void }) {
  const { clients } = useEme();
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<Payment>("efectivo");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Order | null>(null);

  function submit() {
    if (lines.length === 0) return setError("Agregá al menos un producto.");
    if (payment === "cuenta" && !clientName.trim()) return setError("Para cuenta corriente poné el nombre del cliente.");
    setError("");
    const order = createOrder({
      channel: "mostrador",
      // Con direccion va por delivery; sin direccion, retira en el local.
      kind: address.trim() ? "delivery" : "retiro",
      lines,
      note,
      clientName: clientName.trim(),
      phone,
      address: address.trim(),
      payment,
      clientId: null // se vincula por nombre; si no existe, se crea en cuenta corriente
    });
    setCreated(order);
    setLines([]);
    setNote("");
    setClientName("");
    setPhone("");
    setAddress("");
    setPayment("efectivo");
  }

  function closeTicket() {
    setCreated(null);
    onCreated();
  }

  return (
    <section className="new-order">
      <h2>Nuevo pedido</h2>

      <div className="form">
        <div className="client-row">
          {/* 18/11/2026: sin sugerencias ni nada precargado. Los clientes guardados
              se eligen solo en la lista de cuenta corriente (abajo). */}
          <input placeholder="Nuevo cliente" autoComplete="off" value={clientName} onChange={(event) => setClientName(event.target.value)} />
          <input placeholder="Teléfono" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <input placeholder="Dirección" autoComplete="off" value={address} onChange={(event) => setAddress(event.target.value)} />
        </div>

        <div className="seg">
          {(["efectivo", "tarjeta", "cuenta"] as Payment[]).map((value) => (
            <button key={value} type="button" className={payment === value ? "on" : ""} onClick={() => setPayment(value)}>
              {value === "efectivo" ? "Efectivo" : value === "tarjeta" ? "Tarjeta" : "Cta. corriente"}
            </button>
          ))}
        </div>
        {/* Cuenta corriente (18/11/2026): en el renglon de abajo, una lista a lo
            ancho con los clientes de cuenta corriente, solo para elegir uno. */}
        {payment === "cuenta" && (
          <select
            className="client-select"
            value={clients.some((client) => client.name === clientName) ? clientName : ""}
            onChange={(event) => {
              const match = clients.find((client) => client.name === event.target.value);
              if (!match) return;
              setClientName(match.name);
              setPhone(match.phone);
              setAddress(match.address ?? "");
            }}
          >
            <option value="" disabled>
              Elegí un cliente de cuenta corriente
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.name}>
                {client.name}
              </option>
            ))}
          </select>
        )}
        {payment === "cuenta" && (
          <p className="hint">
            Se anota en la cuenta corriente de {clientName.trim() || "…"}
            {clientName.trim() && !clients.some((client) => client.name.toLowerCase() === clientName.trim().toLowerCase()) ? " (cliente nuevo, se crea solo)" : ""}.
          </p>
        )}
      </div>

      <ProductPicker lines={lines} onChange={setLines} />
      <textarea className="note-input" placeholder="Nota para cocina" value={note} onChange={(event) => setNote(event.target.value)} />
      {error && <p className="error">{error}</p>}
      <button type="button" className="btn primary wide" onClick={submit}>
        Ingresar pedido
      </button>

      {/* El pedido ya esta guardado: se imprime (o simula) apenas se ingresa. */}
      {created && <PrintModal order={created} autoPrint onClose={closeTicket} />}
    </section>
  );
}
