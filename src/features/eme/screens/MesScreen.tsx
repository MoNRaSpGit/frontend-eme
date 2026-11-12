import { useState } from "react";
import { SalesLineChart } from "../components/SalesLineChart";
import { useEme } from "../eme.store";
import { isSameMonth, money } from "../eme.format";
import { loadProfitPercent } from "../eme.profit";
import type { Order } from "../eme.types";

// Igual que el "Mes" de Joker: selector de mes, total y ganancia, semanas
// desplegables con sus dias y, abajo, el grafico historico por mes.
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Total por dia. El mes actual sale de los pedidos reales; los meses
// anteriores son datos de ejemplo (demo) y los futuros quedan en cero.
function dayTotals(year: number, month: number, orders: Order[], now: Date): number[] {
  const days = new Date(year, month + 1, 0).getDate();
  const key = year * 12 + month;
  const nowKey = now.getFullYear() * 12 + now.getMonth();
  if (key > nowKey) return Array(days).fill(0);
  if (key === nowKey) {
    const totals = Array(days).fill(0) as number[];
    for (const order of orders) {
      if (order.status === "entregado" && isSameMonth(order.createdAt, now)) totals[new Date(order.createdAt).getDate() - 1] += order.total;
    }
    return totals;
  }
  let seedValue = (key * 7919) % 233280 || 1;
  return Array.from({ length: days }, () => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    const r = seedValue / 233280;
    return r < 0.1 ? 0 : Math.round((2200 + r * 6800) / 10) * 10;
  });
}

export function MesScreen() {
  const { orders } = useEme();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set([1]));
  const profitPercent = loadProfitPercent();

  const totals = dayTotals(year, month, orders, now);
  const monthTotal = totals.reduce((sum, value) => sum + value, 0);
  const profit = (value: number) => value * (profitPercent / 100);

  // Semana 1 = dias 1-7, 2 = 8-14, 3 = 15-21, 4 = 22 en adelante (como en Joker).
  const weeks = [1, 2, 3, 4].map((number) => {
    const days = totals
      .map((total, index) => ({ day: index + 1, total }))
      .filter((item) => Math.min(4, Math.ceil(item.day / 7)) === number)
      .map((item) => ({
        ...item,
        weekday: WEEKDAYS[new Date(year, month, item.day).getDay()],
        date: String(item.day).padStart(2, "0") + "/" + String(month + 1).padStart(2, "0") + "/" + year
      }));
    return { number, days, total: days.reduce((sum, item) => sum + item.total, 0) };
  });

  const history = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const total = dayTotals(date.getFullYear(), date.getMonth(), orders, now).reduce((sum, value) => sum + value, 0);
    return { key: date.getFullYear() + "-" + date.getMonth(), label: MONTH_SHORT[date.getMonth()], total, highlight: index === 5 };
  });

  function toggleWeek(number: number) {
    setOpenWeeks((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  function shiftMonth(delta: number) {
    const date = new Date(year, month + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    setOpenWeeks(new Set([1]));
  }

  return (
    <section>
      <div className="mes-head">
        <p className="hint">Mes</p>
        <div className="mes-selector">
          <button type="button" className="btn small" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <h2>
            {MONTH_NAMES[month]} {year}
          </h2>
          <button type="button" className="btn small" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
            ›
          </button>
        </div>
      </div>

      <div className="panel-top">
        <div className="stat hero">
          <span>Total del mes</span>
          <b>{money(monthTotal)}</b>
        </div>
        <div className="stat">
          <span>Ganancia ({profitPercent}%)</span>
          <b className="ok">{money(profit(monthTotal))}</b>
        </div>
      </div>

      {weeks.map((week) => {
        const open = openWeeks.has(week.number);
        return (
          <div key={week.number} className="mes-week">
            <button type="button" className="mes-week-head" onClick={() => toggleWeek(week.number)} aria-expanded={open}>
              <span className="mes-arrow">{open ? "▾" : "▸"}</span>
              <h3>Semana {week.number}</h3>
              <span className="mes-week-totals">
                <b>{money(week.total)}</b>
                <small className="ok">+{money(profit(week.total))}</small>
              </span>
            </button>
            {open && (
              <table className="mes-table">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Fecha</th>
                    <th className="num">Total</th>
                    <th className="num">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {week.days.map((item) => (
                    <tr key={item.day} className={item.total === 0 ? "empty-row" : ""}>
                      <td>{item.weekday}</td>
                      <td>{item.date}</td>
                      <td className="num">{money(item.total)}</td>
                      <td className="num ok">{item.total > 0 ? money(profit(item.total)) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      <div className="card">
        <h3>Ventas por mes</h3>
        <SalesLineChart points={history} ariaLabel="Ventas por mes" />
      </div>
      <p className="hint">Mes actual con los pedidos reales; meses anteriores son datos de ejemplo.</p>
    </section>
  );
}
