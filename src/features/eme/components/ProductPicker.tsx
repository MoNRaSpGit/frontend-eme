import { useState } from "react";
import { MENU, MENU_CATEGORIES } from "../eme.menu";
import { money } from "../eme.format";
import type { OrderLine } from "../eme.types";

type Props = { lines: OrderLine[]; onChange: (lines: OrderLine[]) => void };

// Menu tocable + carrito. Lo usan Mesas (levantar pedido) y Caja (nuevo pedido).
export function ProductPicker({ lines, onChange }: Props) {
  const [category, setCategory] = useState<string>(MENU_CATEGORIES[0]);

  function add(productId: string) {
    const product = MENU.find((item) => item.id === productId)!;
    const existing = lines.find((line) => line.productId === productId);
    if (existing) onChange(lines.map((line) => (line.productId === productId ? { ...line, qty: line.qty + 1 } : line)));
    else onChange([...lines, { productId, name: product.name, price: product.price, qty: 1 }]);
  }

  function setQty(productId: string, qty: number) {
    onChange(qty > 0 ? lines.map((line) => (line.productId === productId ? { ...line, qty } : line)) : lines.filter((line) => line.productId !== productId));
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
          const qty = lines.find((line) => line.productId === item.id)?.qty ?? 0;
          return (
            <button key={item.id} type="button" className={qty > 0 ? "tile picked" : "tile"} onClick={() => add(item.id)}>
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
          <div key={line.productId} className="cart-row">
            <span>{line.name}</span>
            <div className="stepper">
              <button type="button" onClick={() => setQty(line.productId, line.qty - 1)} aria-label="Menos">
                −
              </button>
              <b>{line.qty}</b>
              <button type="button" onClick={() => setQty(line.productId, line.qty + 1)} aria-label="Más">
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
    </div>
  );
}
