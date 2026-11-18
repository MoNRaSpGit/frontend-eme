import { FOOTER_TEXT, LOCAL_INFO, lineBaseName } from "../eme.print";
import { money } from "../eme.format";
import type { Order } from "../eme.types";

// Como se ve en papel cada ticket (18/11/2026). Se usa en el modo simulado para
// mostrar en pantalla lo que se "imprimio".
const KIND_LABEL = { salon: "Salón", delivery: "Delivery", retiro: "Retiro" } as const;
const PAYMENT_LABEL = { efectivo: "Efectivo", tarjeta: "Tarjeta", cuenta: "Cuenta corriente" } as const;

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function TicketClientePreview({ order }: { order: Order }) {
  const localLine = [LOCAL_INFO.address, LOCAL_INFO.phone].filter(Boolean).join(" · ");
  return (
    <div className="paper paper-cliente">
      <div className="paper-logo">LOGO</div>
      <div className="paper-title">{LOCAL_INFO.name}</div>
      {localLine && <div className="paper-sub">{localLine}</div>}
      <hr />
      <div className="paper-row">
        <span>Fecha: {fecha(order.createdAt)}</span>
        <span>Hora: {hora(order.createdAt)}</span>
      </div>
      <div className="paper-row">
        <b>Pedido #{order.number}</b>
        <span>{KIND_LABEL[order.kind]}</span>
      </div>
      {order.clientName && <div>Cliente: {order.clientName}</div>}
      {order.phone && <div>Tel: {order.phone}</div>}
      {order.address && <div>Dirección: {order.address}</div>}
      <hr />
      {order.lines.map((line) => (
        <div key={line.name} className="paper-row">
          <span>
            {line.qty} x {line.name}
          </span>
          <span>{money(line.price * line.qty)}</span>
        </div>
      ))}
      {order.note && <div className="paper-small">Nota: {order.note}</div>}
      <hr />
      <div className="paper-row paper-total">
        <span>TOTAL</span>
        <span>{money(order.total)}</span>
      </div>
      <div>Pago: {PAYMENT_LABEL[order.payment]}</div>
      <hr />
      <div className="paper-center">
        <b>¡Gracias por su compra!</b>
      </div>
      <hr />
      <div className="paper-footer">{FOOTER_TEXT}</div>
    </div>
  );
}

export function ComandaPreview({ order }: { order: Order }) {
  const count = order.lines.reduce((sum, line) => sum + line.qty, 0);
  return (
    <div className="paper paper-comanda">
      <div className="comanda-head">
        <div className="comanda-title">COMANDA</div>
        <div className="comanda-meta">
          Pedido #{order.number} · {KIND_LABEL[order.kind].toUpperCase()}
        </div>
      </div>
      <div className="comanda-body">
        {order.lines.map((line) => (
          <div key={line.name} className="comanda-item">
            <div className="comanda-name">
              <span className="comanda-qty">{line.qty}</span>
              {lineBaseName(line)}
            </div>
            {(line.removed?.length || line.extras?.length) ? (
              <div className="comanda-mods">
                {line.removed?.map((item) => (
                  <div key={"s" + item} className="comanda-sin">
                    <b>SIN</b>
                    {item}
                  </div>
                ))}
                {line.extras?.map((item) => (
                  <div key={"c" + item} className="comanda-con">
                    <b>+</b>
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {order.note && (
        <div className="comanda-note">
          <span>NOTA</span>
          {order.note}
        </div>
      )}
      <div className="comanda-foot">
        {count} {count === 1 ? "producto" : "productos"}
      </div>
    </div>
  );
}
