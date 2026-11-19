import { useState } from "react";
import { money } from "../eme.format";
import { categoriesOf, deleteProduct, productsOf, saveProduct, useEme } from "../eme.store";
import type { Product } from "../eme.types";

const NEW_CATEGORY = "__nueva__";

// Pestaña "Productos" (18/11/2026): alta, edicion y borrado de productos con su
// categoria, precio e ingredientes (opcionales: si no tiene, no se muestran).
export function ProductosScreen() {
  const eme = useEme();
  const products = productsOf(eme);
  const categories = categoriesOf(eme);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [ingredients, setIngredients] = useState("");
  // Ganancia en $ por unidad (19/11/2026). Se guarda como costo = precio - ganancia.
  const [profit, setProfit] = useState("");
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function clearForm() {
    setEditingId(null);
    setName("");
    setPrice("");
    setCategory(categories[0] ?? "");
    setNewCategory("");
    setIngredients("");
    setProfit("");
    setError("");
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setName(product.name);
    setPrice(String(product.price));
    setCategory(product.category);
    setNewCategory("");
    setIngredients((product.ingredients ?? []).join(", "));
    setProfit(product.cost > 0 ? String(product.price - product.cost) : "");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit() {
    const priceNum = Number(price);
    const finalCategory = category === NEW_CATEGORY ? newCategory.trim() : category || categories[0] || "";
    if (!name.trim()) return setError("Poné el nombre del producto.");
    if (!price.trim() || !Number.isFinite(priceNum) || priceNum < 0) return setError("Poné un precio válido.");
    if (!finalCategory) return setError("Elegí o escribí una categoría.");
    const profitNum = profit.trim() ? Number(profit) : null;
    if (profitNum !== null && (!Number.isFinite(profitNum) || profitNum > priceNum)) return setError("La ganancia no puede ser mayor que el precio.");
    // saveProduct suma la categoria nueva si no existia.
    saveProduct({
      id: editingId ?? undefined,
      name: name.trim(),
      price: Math.round(priceNum),
      cost: profitNum === null ? undefined : Math.round(priceNum - profitNum),
      category: finalCategory,
      ingredients: ingredients.split(",")
    });
    clearForm();
  }

  return (
    <section className="productos">
      <h2>{editingId ? "Editar producto" : "Nuevo producto"}</h2>

      <div className="form">
        <input placeholder="Nombre (ej: Hamburguesa doble carne)" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} />
        <input placeholder="Precio" inputMode="numeric" autoComplete="off" value={price} onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ""))} />
        <input placeholder="Ganancia en $ (ej: 30)" inputMode="numeric" autoComplete="off" value={profit} onChange={(event) => setProfit(event.target.value.replace(/[^\d]/g, ""))} />
        <select className="client-select" value={category || categories[0] || ""} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
          <option value={NEW_CATEGORY}>+ Nueva categoría</option>
        </select>
        {category === NEW_CATEGORY && (
          <input placeholder="Nombre de la nueva categoría" autoComplete="off" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
        )}
        <textarea
          className="note-input"
          placeholder="Ingredientes (opcional), separados por coma. Ej: pan, 2 carnes, cheddar, panceta"
          value={ingredients}
          onChange={(event) => setIngredients(event.target.value)}
        />
      </div>

      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="button" className="btn primary wide" onClick={submit}>
          {editingId ? "Guardar cambios" : "Agregar producto"}
        </button>
        {editingId && (
          <button type="button" className="btn" onClick={clearForm}>
            Cancelar
          </button>
        )}
      </div>

      <h2>Productos</h2>
      {categories.map((cat) => {
        const items = products.filter((item) => item.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="prod-group">
            <h3>{cat}</h3>
            {items.map((item) => (
              <div key={item.id} className="prod-row">
                <div className="prod-info">
                  <b>{item.name}</b>
                  {item.ingredients && item.ingredients.length > 0 ? <span className="hint">{item.ingredients.join(", ")}</span> : null}
                </div>
                <div className="prod-price">
                  <b>{money(item.price)}</b>
                  {item.cost > 0 ? <small className="hint ok"> gana {money(item.price - item.cost)}</small> : null}
                </div>
                {confirmDeleteId === item.id ? (
                  <div className="row">
                    <button
                      type="button"
                      className="btn small danger"
                      onClick={() => {
                        deleteProduct(item.id);
                        setConfirmDeleteId(null);
                      }}
                    >
                      Borrar
                    </button>
                    <button type="button" className="btn small" onClick={() => setConfirmDeleteId(null)}>
                      No
                    </button>
                  </div>
                ) : (
                  <div className="row">
                    <button type="button" className="btn small" onClick={() => startEdit(item)}>
                      Editar
                    </button>
                    <button type="button" className="btn small" onClick={() => setConfirmDeleteId(item.id)}>
                      🗑
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
