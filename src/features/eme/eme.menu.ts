import type { Product } from "./eme.types";

export const MENU_CATEGORIES = ["Pizzas", "Hamburguesas", "Minutas", "Bebidas", "Postres"] as const;

export const MENU: Product[] = [
  { id: "pz-muza", category: "Pizzas", name: "Pizza muzzarella", price: 420, cost: 170, emoji: "🍕" },
  { id: "pz-esp", category: "Pizzas", name: "Pizza especial", price: 560, cost: 230, emoji: "🍕" },
  { id: "pz-fuga", category: "Pizzas", name: "Fugazzeta", price: 520, cost: 200, emoji: "🍕" },
  { id: "pz-napo", category: "Pizzas", name: "Pizza napolitana", price: 540, cost: 215, emoji: "🍕" },
  { id: "hb-clas", category: "Hamburguesas", name: "Hamburguesa clásica", price: 390, cost: 150, emoji: "🍔" },
  { id: "hb-doble", category: "Hamburguesas", name: "Hamburguesa doble", price: 520, cost: 210, emoji: "🍔" },
  { id: "hb-bacon", category: "Hamburguesas", name: "Hamburguesa con bacon", price: 560, cost: 230, emoji: "🥓" },
  { id: "mi-mila", category: "Minutas", name: "Milanesa con papas", price: 480, cost: 190, emoji: "🥩" },
  { id: "mi-chivi", category: "Minutas", name: "Chivito al plato", price: 690, cost: 290, emoji: "🥪" },
  { id: "mi-papas", category: "Minutas", name: "Papas fritas", price: 220, cost: 70, emoji: "🍟" },
  { id: "bb-coca", category: "Bebidas", name: "Coca-Cola 500 ml", price: 120, cost: 55, emoji: "🥤" },
  { id: "bb-coca15", category: "Bebidas", name: "Coca-Cola 1,5 L", price: 210, cost: 100, emoji: "🥤" },
  { id: "bb-agua", category: "Bebidas", name: "Agua mineral", price: 90, cost: 35, emoji: "💧" },
  { id: "bb-cerv", category: "Bebidas", name: "Cerveza 1 L", price: 260, cost: 120, emoji: "🍺" },
  { id: "po-flan", category: "Postres", name: "Flan con dulce de leche", price: 180, cost: 60, emoji: "🍮" },
  { id: "po-helado", category: "Postres", name: "Helado 2 bochas", price: 200, cost: 70, emoji: "🍨" }
];

export function findMenuItem(id: string) {
  return MENU.find((item) => item.id === id);
}
