import { useState } from "react";
import { MENU, MENU_CATEGORIES, PIZZA_EXTRAS } from "../eme.menu";
import { money } from "../eme.format";
import type { OrderLine, Product } from "../eme.types";

type Props = { lines: OrderLine[]; onChange: (lines: OrderLine[]) => void };

// Menu tocable + carrito. Lo usan Mesas (levantar pedido) y Caja (nuevo pedido).
export function ProductPicker({ lines, onChange }: Props) {
  const [category, setCategory] = useState<string>(MENU_CATEGORIES[0]);

  const [extrasFor, setExtrasFor] = useState<Product | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);

  // Suma una linea; si ya existe igual (mismo producto y mismos extras) sube la cantidad.
  function addLine(product: Product, extraIds: string[]) {
    const extras = PIZZA_EXTRAS.filter((extra) => extraIds.includes(extra.id));
    const name = extras.length ? product.name + " + " + extras.map((extra) => extra.label.toLowerCase()).join(", ") : product.name;
    const price = product.price + extras.reduce((sum, extra) => sum + extra.price, 0);
    const existing = lines.find((line) => line.name === name);
    if (existing) onChange(lines.map((line) => (line.name === name ? { ...line, qty: line.qty + 1 } : line)));
    else onChange([...lines, { productId: product.id, name, price, qty: 1, extras: extras.map((extra) => extra.label) }]);
  }

  // Las pizzas abren las opciones de ingredientes; el resto se agrega directo.
  function tapProduct(product: Product) {
    if (product.category === "Pizzas") {
      setChosen([]);
      setExtrasFor(product);
    } else {
      addLine(product, []);
    }
  }

  function setQty(name: string, qty: number) {
    onChange(qty > 0 ? lines.map((line) => (line.name === name ? { ...line, qty } : line)) : lines.filter((line) => line.name !== name));
  }

  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0);

  return (
    <div className="picker">
      <div className="chips">
        {MENU_CATEGORIES.map((name) => (
          <button key={name} type="button" className={category === name ? "chip on" : "chip"} onClick={() => setCategory(name)}>
            {name}
          </button>
        ))}
      </div>

      <div className="tiles">
        {MENU.filter((item) => item.category === category).map((item) => {
          const qty = lines.filter((line) => line.productId === item.id).reduce((sum, line) => sum + line.qty, 0);
          return (
            <button key={item.id} type="button" className={qty > 0 ? "tile picked" : "tile"} onClick={() => tapProduct(item)}>
              <span className="tile-emoji">{item.emoji}</span>
              <strong>{item.name}</strong>
              <span className="tile-price">{money(item.price)}</span>
              {qty > 0 && <span className="tile-badge">{qty}</span>}
            </button>
          );
        })}
      </div>

      <div className="cart">
        <h3>Pedido</h3>
        {lines.length === 0 && <p className="hint">Tocá los productos para agregarlos.</p>}
        {lines.map((line) => (
          <div key={line.name} className="cart-row">
            <span>{line.name}</span>
            <div className="stepper">
              <button type="button" onClick={() => setQty(line.name, line.qty - 1)} aria-label="Menos">
                −
              </button>
              <b>{line.qty}</b>
              <button type="button" onClick={() => setQty(line.name, line.qty + 1)} aria-label="Más">
                +
              </button>
            </div>
            <b className="cart-sum">{money(line.price * line.qty)}</b>
          </div>
        ))}
        <div className="cart-total">
          <span>Total</span>
          <b>{money(total)}</b>
        </div>
      </div>

      {extrasFor && (
        <div className="modal-backdrop" onClick={() => setExtrasFor(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>
              {extrasFor.emoji} {extrasFor.name}
            </h2>
            <p className="hint">¿Querés agregarle algo?</p>
            <div className="extras">
              {PIZZA_EXTRAS.map((extra) => {
                const on = chosen.includes(extra.id);
                return (
                  <button
                    key={extra.id}
                    type="button"
                    className={on ? "extra on" : "extra"}
                    onClick={() => setChosen(on ? chosen.filter((id) => id !== extra.id) : [...chosen, extra.id])}
                  >
                    <span>{on ? "✓ " : ""}{extra.label}</span>
                    <b>+ {money(extra.price)}</b>
                  </button>
                );
              })}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  addLine(extrasFor, chosen);
                  setExtrasFor(null);
                }}
              >
                Agregar · {money(extrasFor.price + PIZZA_EXTRAS.filter((extra) => chosen.includes(extra.id)).reduce((sum, extra) => sum + extra.price, 0))}
              </button>
              <button type="button" className="btn" onClick={() => setExtrasFor(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
