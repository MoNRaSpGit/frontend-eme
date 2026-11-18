import { useState } from "react";
import { getPrintMode, getPrinterName, listPrinters, setPrintMode, setPrinterName, type PrintMode } from "../eme.print";

// Configuracion de la impresora (18/11/2026): modo simulado (sin impresora) o
// QZ Tray (impresora termica real). Se guarda en esta computadora.
export function PrinterSettings({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<PrintMode>(getPrintMode);
  const [printer, setPrinter] = useState(getPrinterName() ?? "");
  const [printers, setPrinters] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function search() {
    setBusy(true);
    setMessage("");
    try {
      const found = await listPrinters();
      setPrinters(found);
      if (found.length === 0) setMessage("QZ Tray no encontró impresoras. Revisá que la impresora esté instalada.");
      else if (!printer) setPrinter(found[0]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo buscar impresoras.");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    setPrintMode(mode);
    if (mode === "qz" && printer) setPrinterName(printer);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2>🖨 Impresora</h2>
        <div className="seg">
          <button type="button" className={mode === "simulado" ? "on" : ""} onClick={() => setMode("simulado")}>
            Simulado
          </button>
          <button type="button" className={mode === "qz" ? "on" : ""} onClick={() => setMode("qz")}>
            Impresora (QZ Tray)
          </button>
        </div>
        {mode === "simulado" ? (
          <p className="hint">No imprime: al ingresar un pedido muestra en pantalla los tickets que saldrían.</p>
        ) : (
          <>
            <p className="hint">Imprime directo en la térmica. QZ Tray tiene que estar abierto en esta computadora.</p>
            <button type="button" className="btn" disabled={busy} onClick={() => void search()}>
              {busy ? "Buscando…" : "Buscar impresoras"}
            </button>
            {printers.length > 0 ? (
              <select className="client-select" value={printer} onChange={(event) => setPrinter(event.target.value)}>
                {printers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : printer ? (
              <p className="hint">Impresora guardada: {printer}</p>
            ) : null}
          </>
        )}
        {message && <p className="error">{message}</p>}
        <div className="modal-actions">
          <button type="button" className="btn primary" onClick={save} disabled={mode === "qz" && !printer}>
            Guardar
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
