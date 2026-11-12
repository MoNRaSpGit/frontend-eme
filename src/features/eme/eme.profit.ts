// Porcentaje de ganancia de la demo (30% por defecto), editable con doble clic
// en Pedidos y usado tambien en Mes.
export const PROFIT_KEY = "eme-profit-rate";

export function loadProfitPercent(): number {
  try {
    const value = Number(localStorage.getItem(PROFIT_KEY));
    if (value > 0 && value <= 100) return value;
  } catch {
    // usa el valor por defecto
  }
  return 30;
}
