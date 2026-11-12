import { useState } from "react";
import { IncomingOrders } from "./components/IncomingOrderModal";
import { CuentaCorrienteScreen } from "./screens/CuentaCorrienteScreen";
import { MesScreen } from "./screens/MesScreen";
import { NuevoPedidoScreen } from "./screens/NuevoPedidoScreen";
import { PedidosScreen } from "./screens/PedidosScreen";
import { SyncBadge } from "./components/SyncBadge";
import { trackActivity } from "../../shared/state/activityLog";
import { resetDemo, useEme } from "./eme.store";

type Tab = "pedidos" | "nuevo" | "cuenta" | "mes";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "nuevo", icon: "➕", label: "Nuevo pedido" },
  { id: "pedidos", icon: "📋", label: "Pedidos" },
  { id: "cuenta", icon: "📒", label: "Cuenta corriente" },
  { id: "mes", icon: "📈", label: "Mes" }
];

// Rol "Caja / Mostrador": ve todo, como administrador.
export function CajaPage({ onLogout }: { onLogout: () => void }) {
  const { orders } = useEme();
  const [tab, setTab] = useState<Tab>("nuevo");

  function openTab(next: Tab) {
    setTab(next);
    trackActivity("seccion", "Abrió " + (TABS.find((item) => item.id === next)?.label ?? next));
  }

  function confirmReset() {
    if (window.confirm("¿Volver a los datos de ejemplo?")) resetDemo();
  }

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
          <SyncBadge />
          <button type="button" className="btn small reset-top" onClick={confirmReset}>
            Reiniciar demo
          </button>
          <button type="button" className="btn small" onClick={onLogout}>
            Salir
          </button>
        </div>
      </header>



      <div className="caja-body">
        <div className="caja-main">
          {tab === "pedidos" && <PedidosScreen />}
          {tab === "nuevo" && <NuevoPedidoScreen onCreated={() => setTab("pedidos")} />}
          {tab === "cuenta" && <CuentaCorrienteScreen />}
          {tab === "mes" && <MesScreen />}
        </div>
        <nav className="sidebar">
          {TABS.map((item) => (
            <button key={item.id} type="button" className={tab === item.id ? "on" : ""} onClick={() => openTab(item.id)}>
              <span className="side-icon">{item.icon}</span>
              <span className="side-label">{item.label}</span>
              {item.id === "pedidos" && incoming.length > 0 && <span className="dot">{incoming.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* En celular el boton va abajo, como "Ingresar pedido"; en PC queda arriba. */}
      <button type="button" className="btn wide reset-bottom" onClick={confirmReset}>
        Reiniciar demo
      </button>

      <IncomingOrders orders={incoming} />
    </div>
  );
}
