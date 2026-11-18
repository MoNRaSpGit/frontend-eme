import { useEffect, useRef, useState } from "react";
import { getDefaultCopies, printOrder, setDefaultCopies, type Copies, type PrintResult } from "../eme.print";
import type { Order } from "../eme.types";
import { ComandaPreview, TicketClientePreview } from "./TicketPreviews";

type Props = {
  order: Order;
  // true: imprime apenas se abre (al ingresar un pedido). false: primero se elige
  // 1 o 2 tickets y se toca Imprimir (reimprimir desde Pedidos).
  autoPrint: boolean;
  onClose: () => void;
};

// Ventana de impresion (18/11/2026). El pedido YA esta guardado cuando se abre:
// si la impresora falla, se avisa y se puede reintentar o reimprimir despues.
export function PrintModal({ order, autoPrint, onClose }: Props) {
  const [copies, setCopies] = useState<Copies>(getDefaultCopies);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PrintResult | null>(null);
  const [error, setError] = useState("");
  const started = useRef(false);

  async function run(chosen: Copies) {
    setBusy(true);
    setError("");
    setResult(null);
    setDefaultCopies(chosen);
    try {
      setResult(await printOrder(order, chosen));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo imprimir.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (autoPrint && !started.current) {
      started.current = true;
      void run(copies);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal print-modal" onClick={(event) => event.stopPropagation()}>
        <h2>Pedido #{order.number}</h2>

        <div className="seg">
          {([1, 2] as Copies[]).map((value) => (
            <button key={value} type="button" className={copies === value ? "on" : ""} onClick={() => setCopies(value)} disabled={busy}>
              {value === 1 ? "1 ticket (cliente)" : "2 tickets (+ comanda)"}
            </button>
          ))}
        </div>

        {busy && <p className="hint">Imprimiendo…</p>}

        {error && (
          <div className="print-error">
            <b>No se pudo imprimir.</b>
            <span>{error}</span>
            <span>El pedido #{order.number} quedó guardado igual. Podés reintentar ahora o reimprimirlo después desde Pedidos.</span>
          </div>
        )}

        {result && (
          <div className="print-ok">
            {result.mode === "simulado" ? (
              <b>Impresión simulada: estos {result.tickets.length === 1 ? "es el ticket" : "son los tickets"} que salen.</b>
            ) : (
              <b>
                ✓ Impreso en "{result.printer}": {result.tickets.length === 1 ? "ticket del cliente" : "ticket del cliente y comanda"}.
              </b>
            )}
          </div>
        )}

        {result?.mode === "simulado" && (
          <div className="papers">
            <TicketClientePreview order={order} />
            {result.tickets.includes("comanda") && <ComandaPreview order={order} />}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn primary" disabled={busy} onClick={() => void run(copies)}>
            {result || error ? "Imprimir de nuevo" : "Imprimir"}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
