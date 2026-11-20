import { useState } from "react";
import { ProductPicker } from "./ProductPicker";
import { pizzaExtrasFor } from "../eme.menu";
import { editOrder, productsOf, useEme } from "../eme.store";
import type { Order, OrderLine } from "../eme.types";

// Editar pedido (20/11/2026): se cambian los productos (sumar otra coca, sacar
// algo) y se recalculan total y ganancia. Cliente, pago y entrega no cambian.
export function EditOrderModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const eme = useEme();
  const products = productsOf(eme);
  // El costo de los agregados de pizza no viene guardado en el renglon: se
  // recalcula con la lista de agregados de ese tamaño.
  const [lines, setLines] = useState<OrderLine[]>(() =>
    order.lines.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      const extras = product ? pizzaExtrasFor(product) : [];
      const extraCost = (line.extras ?? []).reduce((sum, label) => sum + (extras.find((extra) => extra.label === label)?.cost ?? 0), 0);
      return { ...line, extraCost };
    })
  );
  const [saving, setSaving] = useState(false);
  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0);

  async function save() {
    if (lines.length === 0 || saving) return;
    setSaving(true);
    const ok = await editOrder(order.id, lines);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal edit-order-modal" onClick={(event) => event.stopPropagation()}>
        <h2>Editar pedido #{order.number}</h2>
        <ProductPicker lines={lines} onChange={setLines} />
        {lines.length === 0 && <p className="error">El pedido quedó vacío. Si no va más, usá "Anular pedido".</p>}
        <div className="modal-actions">
          <button type="button" className="btn primary" disabled={saving || lines.length === 0} onClick={() => void save()}>
            {saving ? "Guardando…" : "Guardar cambios · $ " + Math.round(total).toLocaleString("es-UY")}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
