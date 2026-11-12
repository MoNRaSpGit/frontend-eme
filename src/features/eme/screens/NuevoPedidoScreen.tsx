import { useState } from "react";
import { ProductPicker } from "../components/ProductPicker";
import { TicketModal } from "../components/TicketModal";
import { createOrder, useEme } from "../eme.store";
import type { Channel, Kind, Order, OrderLine, Payment } from "../eme.types";

// La caja ingresa el pedido que llega por WhatsApp o en el mostrador.
export function NuevoPedidoScreen({ onCreated }: { onCreated: () => void }) {
  const { clients, couriers } = useEme();
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [kind, setKind] = useState<Kind>("delivery");
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<Payment>("efectivo");
  const [clientId, setClientId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Order | null>(null);

  function submit() {
    if (lines.length === 0) return setError("Agregá al menos un producto.");
    if (kind === "delivery" && !address.trim()) return setError("Falta la dirección para el delivery.");
    if (payment === "cuenta" && clientId === null) return setError("Elegí el cliente de la cuenta corriente.");
    setError("");
    const chosen = clients.find((client) => client.id === clientId);
    const order = createOrder({
      channel,
      kind,
      lines,
      note,
      clientName: clientName.trim() || chosen?.name || "",
      phone,
      address: kind === "delivery" ? address.trim() : "",
      payment,
      clientId: payment === "cuenta" ? clientId : null
    });
    setCreated(order);
    setLines([]);
    setNote("");
    setClientName("");
    setPhone("");
    setAddress("");
    setPayment("efectivo");
    setClientId(null);
  }

  function closeTicket() {
    setCreated(null);
    onCreated();
  }

  return (
    <section className="new-order">
      <h2>Nuevo pedido</h2>

      <div className="form">
        <div className="seg">
          {(["whatsapp", "mostrador"] as Channel[]).map((value) => (
            <button key={value} type="button" className={channel === value ? "on" : ""} onClick={() => setChannel(value)}>
              {value === "whatsapp" ? "💬 WhatsApp" : "🏪 Mostrador"}
            </button>
          ))}
        </div>
        <div className="seg">
          {(["delivery", "retiro"] as Kind[]).map((value) => (
            <button key={value} type="button" className={kind === value ? "on" : ""} onClick={() => setKind(value)}>
              {value === "delivery" ? "🛵 Delivery" : "🥡 Retira"}
            </button>
          ))}
        </div>
        <input placeholder="Nombre del cliente" value={clientName} onChange={(event) => setClientName(event.target.value)} />
        <input placeholder="Teléfono" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        {kind === "delivery" && <input placeholder="Dirección de entrega" value={address} onChange={(event) => setAddress(event.target.value)} />}

        <div className="seg">
          {(["efectivo", "tarjeta", "cuenta"] as Payment[]).map((value) => (
            <button key={value} type="button" className={payment === value ? "on" : ""} onClick={() => setPayment(value)}>
              {value === "efectivo" ? "Efectivo" : value === "tarjeta" ? "Tarjeta" : "Cta. corriente"}
            </button>
          ))}
        </div>
        {payment === "cuenta" && (
          <select value={clientId ?? ""} onChange={(event) => setClientId(event.target.value ? Number(event.target.value) : null)}>
            <option value="">Elegí el cliente…</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <ProductPicker lines={lines} onChange={setLines} />
      <textarea className="note-input" placeholder="Nota para cocina" value={note} onChange={(event) => setNote(event.target.value)} />
      {error && <p className="error">{error}</p>}
      <button type="button" className="btn primary wide" onClick={submit}>
        Ingresar pedido
      </button>

      {created && <TicketModal order={created} couriers={couriers} onClose={closeTicket} />}
    </section>
  );
}
