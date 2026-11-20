import { useState } from "react";
import { IncomingOrders } from "./components/IncomingOrderModal";
import { CuentaCorrienteScreen } from "./screens/CuentaCorrienteScreen";
import { MesScreen } from "./screens/MesScreen";
import { NuevoPedidoScreen } from "./screens/NuevoPedidoScreen";
import { PedidosScreen } from "./screens/PedidosScreen";
import { ProductosScreen } from "./screens/ProductosScreen";
import { SyncBadge } from "./components/SyncBadge";
import { PrinterSettings } from "./components/PrinterSettings";
import { trackActivity } from "../../shared/state/activityLog";
import { useEme } from "./eme.store";
import { ACCOUNTS_ENABLED } from "./eme.features";

type Tab = "pedidos" | "nuevo" | "cuenta" | "productos" | "mes";

const ALL_TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "nuevo", icon: "➕", label: "Nuevo pedido" },
  { id: "pedidos", icon: "📋", label: "Pedidos" },
  { id: "cuenta", icon: "📒", label: "Cuenta corriente" },
  { id: "productos", icon: "🍔", label: "Productos" },
  { id: "mes", icon: "📈", label: "Mes" }
];
// Cuenta corriente oculta mientras ACCOUNTS_ENABLED sea false (ver eme.features.ts).
const TABS = ALL_TABS.filter((item) => item.id !== "cuenta" || ACCOUNTS_ENABLED);

// Rol "Caja / Mostrador": ve todo, como administrador.
export function CajaPage({ onLogout }: { onLogout?: () => void }) {
  const { orders } = useEme();
  const [tab, setTab] = useState<Tab>("nuevo");
  const [showPrinter, setShowPrinter] = useState(false);

  function openTab(next: Tab) {
    setTab(next);
    trackActivity("seccion", "Abrió " + (TABS.find((item) => item.id === next)?.label ?? next));
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
          <button type="button" className="btn small" onClick={() => setShowPrinter(true)}>
            🖨 Impresora
          </button>
          {onLogout ? (
            <button type="button" className="btn small" onClick={onLogout}>
              Salir
            </button>
          ) : null}
        </div>
      </header>



      <div className="caja-body">
        <div className="caja-main">
          {tab === "pedidos" && <PedidosScreen />}
          {tab === "nuevo" && <NuevoPedidoScreen onCreated={() => setTab("pedidos")} />}
          {ACCOUNTS_ENABLED && tab === "cuenta" && <CuentaCorrienteScreen />}
          {tab === "productos" && <ProductosScreen />}
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

      <IncomingOrders orders={incoming} />
      {showPrinter && <PrinterSettings onClose={() => setShowPrinter(false)} />}
    </div>
  );
}
