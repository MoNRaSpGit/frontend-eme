import { SalesLineChart } from "../components/SalesLineChart";
import { useEme } from "../eme.store";
import { isSameMonth, money } from "../eme.format";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function MesScreen() {
  const { orders, couriers } = useEme();
  const now = new Date();
  const month = orders.filter((order) => order.status === "entregado" && isSameMonth(order.createdAt, now));

  const sales = month.reduce((sum, order) => sum + order.total, 0);
  const cost = month.reduce((sum, order) => sum + order.cost, 0);
  const profit = sales - cost;
  const average = month.length ? sales / month.length : 0;

  const byDay = new Map<number, number>();
  for (const order of month) {
    const day = new Date(order.createdAt).getDate();
    byDay.set(day, (byDay.get(day) ?? 0) + order.total);
  }
  const days = Array.from({ length: now.getDate() }, (_, index) => ({ day: index + 1, total: byDay.get(index + 1) ?? 0 }));

  const channels = [
    { label: "Mesas", total: month.filter((order) => order.channel === "mesa").reduce((s, o) => s + o.total, 0) },
    { label: "WhatsApp", total: month.filter((order) => order.channel === "whatsapp").reduce((s, o) => s + o.total, 0) },
    { label: "Mostrador", total: month.filter((order) => order.channel === "mostrador").reduce((s, o) => s + o.total, 0) }
  ];

  const topProducts = new Map<string, number>();
  for (const order of month) for (const line of order.lines) topProducts.set(line.name, (topProducts.get(line.name) ?? 0) + line.qty);
  const top = [...topProducts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const deliveries = couriers.map((courier) => ({
    name: courier.name,
    count: month.filter((order) => order.courierId === courier.id).length
  }));

  return (
    <section>
      <h2>Mes de {MONTHS[now.getMonth()]}</h2>
      <div className="stat-row">
        <div className="stat hero">
          <span>Ganancia estimada</span>
          <b>{money(profit)}</b>
        </div>
        <div className="stat">
          <span>Ventas</span>
          <b>{money(sales)}</b>
        </div>
        <div className="stat">
          <span>Pedidos</span>
          <b>{month.length}</b>
        </div>
        <div className="stat">
          <span>Ticket promedio</span>
          <b>{money(average)}</b>
        </div>
      </div>

      <div className="card">
        <h3>Ventas por día</h3>
        <SalesLineChart points={days.map((item) => ({ ...item, isToday: item.day === now.getDate() }))} />
      </div>

      <div className="grid">
        <div className="card">
          <h3>Por canal</h3>
          {channels.map((item) => (
            <div key={item.label} className="cart-row">
              <span>{item.label}</span>
              <b>{money(item.total)}</b>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Lo más vendido</h3>
          {top.map(([name, qty]) => (
            <div key={name} className="cart-row">
              <span>{name}</span>
              <b>{qty}</b>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Repartos por repartidor</h3>
          {deliveries.map((item) => (
            <div key={item.name} className="cart-row">
              <span>🛵 {item.name}</span>
              <b>{item.count}</b>
            </div>
          ))}
        </div>
      </div>
      <p className="hint">Ganancia = ventas menos costo de los productos. Datos de ejemplo.</p>
    </section>
  );
}
