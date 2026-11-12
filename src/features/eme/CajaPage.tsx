import { useState } from "react";
import { IncomingOrders } from "./components/IncomingOrderModal";
import { CuentaCorrienteScreen } from "./screens/CuentaCorrienteScreen";
import { MesScreen } from "./screens/MesScreen";
import { NuevoPedidoScreen } from "./screens/NuevoPedidoScreen";
import { PedidosScreen } from "./screens/PedidosScreen";
import { resetDemo, useEme } from "./eme.store";

type Tab = "pedidos" | "nuevo" | "cuenta" | "mes";

const TABS: { id: Tab; label: string }[] = [
  { id: "pedidos", label: "📋 Pedidos" },
  { id: "nuevo", label: "➕ Nuevo pedido" },
  { id: "cuenta", label: "📒 Cuenta corriente" },
  { id: "mes", label: "📈 Mes" }
];

// Rol "Caja / Mostrador": ve todo, como administrador.
export function CajaPage({ onLogout }: { onLogout: () => void }) {
  const { orders } = useEme();
  const [tab, setTab] = useState<Tab>("pedidos");

  const incoming = orders.filter((order) => order.status === "por_aceptar");

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="brand-mark">🧾</span>
          <div>
            <h1>Caja</h1>
            <p>Mostrador</p>
          </div>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn small"
            onClick={() => window.confirm("¿Volver a los datos de ejemplo?") && resetDemo()}
          >
            Reiniciar demo
          </button>
          <button type="button" className="btn small" onClick={onLogout}>
            Salir
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? "on" : ""} onClick={() => setTab(item.id)}>
            {item.label}
            {item.id === "pedidos" && incoming.length > 0 && <span className="dot">{incoming.length}</span>}
          </button>
        ))}
      </nav>

      {tab === "pedidos" && <PedidosScreen />}
      {tab === "nuevo" && <NuevoPedidoScreen onCreated={() => setTab("pedidos")} />}
      {tab === "cuenta" && <CuentaCorrienteScreen />}
      {tab === "mes" && <MesScreen />}

      <IncomingOrders orders={incoming} />
    </div>
  );
}
