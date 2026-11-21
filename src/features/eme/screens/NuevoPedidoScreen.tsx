import { useState } from "react";
import { ProductPicker } from "../components/ProductPicker";
import { PrintModal } from "../components/PrintModal";
import { createOrder, startRegister, useEme } from "../eme.store";
import { ACCOUNTS_ENABLED } from "../eme.features";
import type { Order, OrderLine, Payment } from "../eme.types";
import { SHIPPING_OPTIONS, SHIPPING_PRODUCT_ID } from "../eme.menu";

// La caja ingresa el pedido que llega por WhatsApp o en el mostrador.
export function NuevoPedidoScreen({ onCreated }: { onCreated: () => void }) {
  const { clients, register } = useEme();
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<Payment>("efectivo");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [shipping, setShipping] = useState(0);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Order | null>(null);

  const [saving, setSaving] = useState(false);

  // Caja sin iniciar (20/11/2026): al ingresar el pedido se pide el monto de la
  // caja inicial; "Seguir sin caja" la deja en $0. Despues sigue el pedido.
  const [askRegister, setAskRegister] = useState(false);
  const [registerDraft, setRegisterDraft] = useState("");
  const [startingRegister, setStartingRegister] = useState(false);

  async function startAndContinue(amount: number) {
    setStartingRegister(true);
    const ok = await startRegister(amount);
    setStartingRegister(false);
    if (!ok) return;
    setAskRegister(false);
    setRegisterDraft("");
    await submit(true);
  }

  async function submit(registerChecked = false) {
    if (saving) return;
    if (lines.length === 0) return setError("Agregá al menos un producto.");
    if (payment === "cuenta" && !clientName.trim()) return setError("Para cuenta corriente poné el nombre del cliente.");
    if (!registerChecked && register && !register.openingSet) {
      setAskRegister(true);
      return;
    }
    setError("");
    setSaving(true);
    const order = await createOrder({
      channel: "mostrador",
      // Con direccion va por delivery; sin direccion, retira en el local.
      kind: address.trim() || shipping > 0 ? "delivery" : "retiro",
      // Costo de envio (20/11/2026): va como un renglon mas (sin costo, todo ganancia).
      lines: shipping > 0 ? [...lines, { productId: SHIPPING_PRODUCT_ID, name: "Costo de envío", price: shipping, qty: 1, extras: [], removed: [] }] : lines,
      note,
      clientName: clientName.trim(),
      phone,
      address: address.trim(),
      payment,
      clientId: null // se vincula por nombre; si no existe, se crea en cuenta corriente
    });
    setSaving(false);
    // Si no se pudo guardar, el formulario queda como estaba para reintentar.
    if (!order) return;
    setCreated(order);
    setLines([]);
    setNote("");
    setClientName("");
    setPhone("");
    setAddress("");
    setPayment("efectivo");
    setShipping(0);
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
          <input placeholder="Dirección" autoComplete="off" value={address} onChange={(event) => setAddress(event.target.value)} />
          <input placeholder="Teléfono" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>

        <div className="seg">
          {((ACCOUNTS_ENABLED ? ["efectivo", "tarjeta", "transferencia", "cuenta"] : ["efectivo", "tarjeta", "transferencia"]) as Payment[]).map((value) => (
            <button key={value} type="button" className={payment === value ? "on" : ""} onClick={() => setPayment(value)}>
              {value === "efectivo" ? "Efectivo" : value === "tarjeta" ? "POS" : value === "transferencia" ? "Transferencia" : "Cta. corriente"}
            </button>
          ))}
        </div>
        {/* Costo de envio (20/11/2026): elegir uno pasa el pedido a delivery. */}
        <div className="shipping-row">
          <span>🛵 Costo de envío</span>
          <div className="shipping-options">
            {SHIPPING_OPTIONS.map((value) => (
              <button key={value} type="button" className={shipping === value ? "kind-toggle on" : "kind-toggle"} onClick={() => setShipping(value)}>
                {value === 0 ? "Sin envío" : "$ " + value}
              </button>
            ))}
          </div>
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
      <button type="button" className="btn primary wide" onClick={() => void submit()} disabled={saving}>
        {saving ? "Guardando…" : "Ingresar pedido"}
      </button>

      {/* El pedido ya esta guardado: se elige 1 o 2 tickets y se imprime (19/11/2026). */}
      {askRegister && (
        <div className="modal-backdrop" onClick={() => setAskRegister(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Falta iniciar la caja</h2>
            <p className="hint">¿Con cuánta plata se abre la caja? El pedido se guarda enseguida.</p>
            <input
              className="stat-input"
              autoFocus
              placeholder="Monto (ej: 2000)"
              inputMode="numeric"
              autoComplete="off"
              value={registerDraft}
              onChange={(event) => setRegisterDraft(event.target.value.replace(/[^\d]/g, ""))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && Number(registerDraft) > 0) void startAndContinue(Number(registerDraft));
              }}
            />
            <div className="modal-actions">
              <button type="button" className="btn primary" disabled={startingRegister || !(Number(registerDraft) > 0)} onClick={() => void startAndContinue(Number(registerDraft))}>
                {startingRegister ? "Guardando…" : "Iniciar caja"}
              </button>
              <button type="button" className="btn" disabled={startingRegister} onClick={() => void startAndContinue(0)}>
                Seguir sin caja
              </button>
            </div>
          </div>
        </div>
      )}

      {created && <PrintModal order={created} autoPrint={false} onClose={closeTicket} />}
    </section>
  );
}
