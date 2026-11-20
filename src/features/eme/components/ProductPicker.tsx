import { useState } from "react";
import { pizzaExtrasFor } from "../eme.menu";
import { money } from "../eme.format";
import { categoriesOf, productsOf, useEme } from "../eme.store";
import type { OrderLine, Product } from "../eme.types";

// searchOnly (20/11/2026): para Editar pedido, solo el buscador; los productos
// aparecen recien cuando se escribe algo.
type Props = { lines: OrderLine[]; onChange: (lines: OrderLine[]) => void; searchOnly?: boolean };

// Variantes (19/11/2026): un producto "Base · Variante" (ej: "Pizza Muzzarella · 1M")
// se agrupa con los demas de la misma base. Sin " · " es un producto suelto.
type ProductGroup = { base: string; items: Product[] };
// Ingrediente "A / B": devuelve las opciones (se elige una sola). Si no, null.
function choiceOptions(item: string): string[] | null {
  const options = item.split("/").map((value) => value.trim()).filter(Boolean);
  return options.length > 1 ? options : null;
}
// Sin tildes ni mayusculas, para buscar ("jamon" encuentra "Jamón").
function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
const VARIANT_SEP = " · ";
function baseOf(name: string) {
  const index = name.indexOf(VARIANT_SEP);
  return index === -1 ? name : name.slice(0, index);
}
function variantOf(name: string) {
  const index = name.indexOf(VARIANT_SEP);
  return index === -1 ? name : name.slice(index + VARIANT_SEP.length);
}
function groupProducts(items: Product[]): ProductGroup[] {
  const groups: ProductGroup[] = [];
  for (const item of items) {
    const base = baseOf(item.name);
    const found = groups.find((group) => group.base === base);
    if (found) found.items.push(item);
    else groups.push({ base, items: [item] });
  }
  return groups;
}

// Menu tocable + carrito. Lo usan Mesas (levantar pedido) y Caja (nuevo pedido).
// Productos y categorias salen de "Productos" (18/11/2026).
export function ProductPicker({ lines, onChange, searchOnly = false }: Props) {
  const eme = useEme();
  const MENU = productsOf(eme);
  const MENU_CATEGORIES = categoriesOf(eme);
  const [pickedCategory, setCategory] = useState<string>("");
  // Los productos llegan del servidor un instante despues de abrir: si todavia no
  // se eligio categoria (o ya no existe), se muestra la primera.
  const category = MENU_CATEGORIES.includes(pickedCategory) ? pickedCategory : (MENU_CATEGORIES[0] ?? "");
  // Buscadores (20/11/2026): uno de productos (busca en todas las categorias) y
  // uno chico en la ventana de agregados de pizza.
  const [search, setSearch] = useState("");
  const [extraSearch, setExtraSearch] = useState("");
  const searchKey = normalize(search);
  const visibleProducts = searchKey ? MENU.filter((item) => normalize(item.name).includes(searchKey)) : MENU.filter((item) => item.category === category);

  const [extrasFor, setExtrasFor] = useState<Product | null>(null);
  const [variantsFor, setVariantsFor] = useState<ProductGroup | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  // Ingredientes destildados ("va SIN ...") del producto abierto (18/11/2026).
  const [removed, setRemoved] = useState<string[]>([]);
  // Eleccion en ingredientes "A / B" (clave = el ingrediente tal cual).
  const [picks, setPicks] = useState<Record<string, string>>({});

  // Suma una linea; si ya existe igual (mismo producto, extras y "sin") sube la cantidad.
  function addLine(product: Product, extraIds: string[], removedOnly: string[] = [], swaps: { from: string; to: string }[] = []) {
    const extras = pizzaExtrasFor(product).filter((extra) => extraIds.includes(extra.id));
    const extraCost = extras.reduce((sum, extra) => sum + extra.cost, 0);
    let name = extras.length ? product.name + " + " + extras.map((extra) => extra.label.toLowerCase()).join(", ") : product.name;
    if (swaps.length) name += " · con " + swaps.map((swap) => swap.to.toLowerCase()).join(", ");
    if (removedOnly.length) name += " · sin " + removedOnly.join(", ");
    // En la comanda: "SIN Cheddar" + "[+] Muzzarella".
    const removedItems = [...removedOnly, ...swaps.map((swap) => swap.from)];
    const swapExtras = swaps.map((swap) => swap.to);
    const price = product.price + extras.reduce((sum, extra) => sum + extra.price, 0);
    const existing = lines.find((line) => line.name === name);
    if (existing) onChange(lines.map((line) => (line.name === name ? { ...line, qty: line.qty + 1 } : line)));
    else
      onChange([
        ...lines,
        { productId: product.id, name, baseName: product.name, price, qty: 1, extras: [...extras.map((extra) => extra.label), ...swapExtras], removed: removedItems, extraCost }
      ]);
  }

  // Productos con ingredientes (o pizzas, que tienen extras) abren la ventanita;
  // el resto se agrega directo.
  function tapProduct(product: Product) {
    if (product.category === "Pizzas" || (product.ingredients?.length ?? 0) > 0) {
      setChosen([]);
      setExtraSearch("");
      setRemoved([]);
      setPicks({});
      setExtrasFor(product);
    } else {
      addLine(product, []);
    }
  }

  const [extraOpen, setExtraOpen] = useState(false);
  const [extraDesc, setExtraDesc] = useState("");
  const [extraAmount, setExtraAmount] = useState("");

  function addExtraCost() {
    const description = extraDesc.trim();
    const amount = Math.round(Number(extraAmount));
    if (!description || !amount) return;
    let name = "Adicional: " + description;
    // Si ya hay uno con la misma descripcion, se diferencia para no pisarlo.
    while (lines.some((line) => line.name === name)) name += " ";
    onChange([...lines, { productId: "adicional", name, baseName: description, price: amount, qty: 1, extras: [], removed: [] }]);
    setExtraDesc("");
    setExtraAmount("");
    setExtraOpen(false);
  }

  function setQty(name: string, qty: number) {
    onChange(qty > 0 ? lines.map((line) => (line.name === name ? { ...line, qty } : line)) : lines.filter((line) => line.name !== name));
  }

  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0);

  return (
    <div className="picker">
      <input className="picker-search" placeholder="🔎 Buscar producto (ej: pi, hambur, coca…)" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} />
      {!searchKey && !searchOnly && (
      <div className="chips">
        {MENU_CATEGORIES.map((name) => (
          <button key={name} type="button" className={category === name ? "chip on" : "chip"} onClick={() => setCategory(name)}>
            {name}
          </button>
        ))}
      </div>
      )}

      <div className="tiles">
        {searchKey && visibleProducts.length === 0 ? <p className="hint">No hay productos con "{search}".</p> : null}
        {(searchOnly && !searchKey ? [] : groupProducts(visibleProducts)).map((group) => {
          const first = group.items[0];
          const qty = lines.filter((line) => group.items.some((item) => item.id === line.productId)).reduce((sum, line) => sum + line.qty, 0);
          const prices = group.items.map((item) => item.price);
          const single = group.items.length === 1;
          return (
            <button
              key={group.base}
              type="button"
              className={qty > 0 ? "tile picked" : "tile"}
              onClick={() => (single ? tapProduct(first) : setVariantsFor(group))}
            >
              <span className="tile-emoji">{first.emoji}</span>
              <strong>{group.base}</strong>
              {single && first.ingredients && first.ingredients.length > 0 ? <span className="tile-ingredients">{first.ingredients.join(", ")}</span> : null}
              {!single ? <span className="tile-ingredients">{group.items.map((item) => variantOf(item.name)).join(" · ")}</span> : null}
              <span className="tile-price">{single ? money(first.price) : "desde " + money(Math.min(...prices))}</span>
              {qty > 0 && <span className="tile-badge">{qty}</span>}
            </button>
          );
        })}
      </div>

      {/* 19/11/2026: productos con variantes (x1/x2/x3, 1/2M/1M, lata/litro...)
          salen como uno solo; al tocarlo se elige la variante. */}
      {variantsFor && (
        <div className="modal-backdrop" onClick={() => setVariantsFor(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>
              {variantsFor.items[0].emoji} {variantsFor.base}
            </h2>
            <div className="extras">
              {variantsFor.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="extra"
                  onClick={() => {
                    setVariantsFor(null);
                    tapProduct(item);
                  }}
                >
                  <span>{variantOf(item.name)}</span>
                  <b>{money(item.price)}</b>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setVariantsFor(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
        {/* Costo adicional (19/11/2026): un monto suelto con descripcion (ej:
            "3 salsas" + $200). Va como un renglon mas del pedido, sin costo. */}
        {extraOpen ? (
          <div className="extra-cost">
            <input placeholder="Descripción (ej: 3 salsas)" autoComplete="off" value={extraDesc} onChange={(event) => setExtraDesc(event.target.value)} />
            <input
              placeholder="Monto"
              inputMode="numeric"
              autoComplete="off"
              value={extraAmount}
              onChange={(event) => setExtraAmount(event.target.value.replace(/[^\d]/g, ""))}
            />
            <div className="row">
              <button type="button" className="btn primary small" onClick={addExtraCost} disabled={!extraDesc.trim() || !Number(extraAmount)}>
                Agregar
              </button>
              <button type="button" className="btn small" onClick={() => setExtraOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="kind-toggle" onClick={() => setExtraOpen(true)}>
            + Costo adicional
          </button>
        )}
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
            {(extrasFor.ingredients?.length ?? 0) > 0 && (
              <>
                <p className="hint">Ingredientes: destildá lo que va SIN.</p>
                <div className="extras">
                  {extrasFor.ingredients!.map((item) => {
                    // "A / B" (20/11/2026): se elige uno de los dos (ej: Cheddar / Muzzarella).
                    const options = choiceOptions(item);
                    if (options) {
                      const picked = picks[item] ?? options[0];
                      return options.map((option) => (
                        <button
                          key={item + option}
                          type="button"
                          className={picked === option ? "extra on" : "extra off"}
                          onClick={() => setPicks({ ...picks, [item]: option })}
                        >
                          <span>{picked === option ? "● " + option : "○ " + option}</span>
                        </button>
                      ));
                    }
                    const on = !removed.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        className={on ? "extra on" : "extra off"}
                        onClick={() => setRemoved(on ? [...removed, item] : removed.filter((value) => value !== item))}
                      >
                        <span>{on ? "✓ " + item : "SIN " + item}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {extrasFor.category === "Pizzas" && <p className="hint">¿Querés agregarle algo?</p>}
            {pizzaExtrasFor(extrasFor).length > 0 && (
              <input className="picker-search small" placeholder="🔎 Buscar agregado (ej: ja)" autoComplete="off" value={extraSearch} onChange={(event) => setExtraSearch(event.target.value)} />
            )}
            <div className="extras">
              {pizzaExtrasFor(extrasFor)
                .filter((extra) => chosen.includes(extra.id) || normalize(extra.label).includes(normalize(extraSearch)))
                .map((extra) => {
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
                  // Opcion elegida distinta de la primera: va "con X" (y SIN la primera).
                  const swaps = (extrasFor.ingredients ?? [])
                    .map((item) => ({ options: choiceOptions(item), picked: picks[item] }))
                    .filter((entry): entry is { options: string[]; picked: string } => !!entry.options && !!entry.picked && entry.picked !== entry.options[0])
                    .map((entry) => ({ from: entry.options[0], to: entry.picked }));
                  addLine(extrasFor, chosen, removed, swaps);
                  setExtrasFor(null);
                }}
              >
                Agregar · {money(extrasFor.price + pizzaExtrasFor(extrasFor).filter((extra) => chosen.includes(extra.id)).reduce((sum, extra) => sum + extra.price, 0))}
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
