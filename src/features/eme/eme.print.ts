import qz from "qz-tray";
import { API_BASE_URL } from "../../shared/config/api";
import type { AccountClient, Order, OrderLine } from "./eme.types";
import { renderClienteTicketPng } from "./eme.ticketImage";
import { getEmeState } from "./eme.store";

// Comanda con "CON ..." (20/11/2026): para un renglon con algun "SIN" devuelve
// lo que SI lleva (con "A / B" resuelto a la opcion elegida), los agregados
// pagos aparte y la nota chica de lo que se saco. Sin "SIN" devuelve null.
function comandaDetail(line: OrderLine): { con: string[]; added: string[]; note: string } | null {
  const removed = line.removed ?? [];
  if (removed.length === 0) return null;
  const product = (getEmeState().products ?? []).find((item) => item.id === line.productId);
  if (!product?.ingredients?.length) return null;
  const extras = line.extras ?? [];
  const con: string[] = [];
  const swapped: string[] = [];
  const notes: string[] = [];
  for (const item of product.ingredients) {
    const options = item.split("/").map((value) => value.trim()).filter(Boolean);
    if (options.length > 1) {
      const picked = options.find((option) => extras.includes(option)) ?? options[0];
      con.push(picked);
      if (picked !== options[0]) {
        swapped.push(picked);
        notes.push(picked.toLowerCase() + " en vez de " + options[0].toLowerCase());
      }
    } else if (removed.includes(item)) {
      notes.unshift("sin " + item.toLowerCase());
    } else {
      con.push(item);
    }
  }
  const added = extras.filter((extra) => !swapped.includes(extra));
  return { con, added, note: notes.join(" · ") };
}

// ======================================================================
// Impresion (18/11/2026): ticket del cliente + comanda de cocina.
// Dos modos:
//   - "simulado": no manda nada a la impresora; muestra en pantalla los
//     tickets que se "imprimieron" (para probar sin impresora).
//   - "qz": imprime directo en la termica via QZ Tray (instalado en la PC
//     del local). La conexion se firma con el mismo certificado que usa
//     Joker (endpoints /joker/qz-certificate y /joker/qz-sign del backend).
// El pedido se guarda SIEMPRE antes de imprimir: si la impresora falla, el
// pedido no se pierde y se puede reimprimir desde "Pedidos".
// ======================================================================

// Datos del local para el ticket del cliente. Completar cuando los pasen.
export const LOCAL_INFO = {
  name: "EME RESTAURANTE",
  address: "", // ej: "Av. Italia 1234"
  phone: "" // ej: "099 123 456"
};
export const FOOTER_TEXT = "Uso interno · Sistema Logic Lab · 092 945 696";

export type PrintMode = "simulado" | "qz";
export type TicketKind = "cliente" | "comanda";
export type Copies = 1 | 2;

const MODE_KEY = "eme.print.mode";
const PRINTER_KEY = "eme.print.printer";
const COPIES_KEY = "eme.print.copies";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // sin almacenamiento: se usa el valor por defecto
  }
}

export function getPrintMode(): PrintMode {
  // 19/11/2026: siempre impresora real (se saco el modo simulado).
  void MODE_KEY;
  return "qz";
}
export function setPrintMode(mode: PrintMode) {
  write(MODE_KEY, mode);
}
export function getPrinterName(): string | null {
  return read(PRINTER_KEY);
}
export function setPrinterName(name: string) {
  write(PRINTER_KEY, name);
}
// 1 ticket = solo el del cliente; 2 tickets = cliente + comanda. Se recuerda la ultima eleccion.
export function getDefaultCopies(): Copies {
  return read(COPIES_KEY) === "1" ? 1 : 2;
}
export function setDefaultCopies(copies: Copies) {
  write(COPIES_KEY, String(copies));
}

export function ticketsFor(copies: Copies): TicketKind[] {
  return copies === 1 ? ["cliente"] : ["cliente", "comanda"];
}

// ---------------- QZ Tray ----------------
let qzSecurityConfigured = false;
function configureQzSecurity() {
  if (qzSecurityConfigured) return;
  qzSecurityConfigured = true;
  qz.security.setCertificatePromise((resolve, reject) => {
    fetch(`${API_BASE_URL}/joker/qz-certificate`)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error("No se pudo obtener el certificado."))))
      .then(resolve)
      .catch(reject);
  });
  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    fetch(`${API_BASE_URL}/joker/qz-sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toSign })
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("No se pudo firmar la conexión."))))
      .then((data: { signature: string }) => resolve(data.signature))
      .catch(reject);
  });
}

async function ensureQzConnected() {
  configureQzSecurity();
  if (!qz.websocket.isActive()) {
    try {
      await qz.websocket.connect();
    } catch {
      throw new Error("No se pudo conectar con QZ Tray. Revisá que esté abierto en esta computadora.");
    }
  }
}

export async function listPrinters(): Promise<string[]> {
  await ensureQzConnected();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [];
}

// ---------------- ESC/POS (impresora termica de 80 mm) ----------------
const WIDTH = 48;
const INIT = "\x1B\x40";
const CENTER = "\x1B\x61\x01";
const LEFT = "\x1B\x61\x00";
const BOLD_ON = "\x1B\x45\x01";
const BOLD_OFF = "\x1B\x45\x00";
const SIZE_NORMAL = "\x1D\x21\x00";
const SIZE_DOUBLE = "\x1D\x21\x11"; // ancho y alto x2 (24 caracteres por renglon)
const SIZE_TALL = "\x1D\x21\x01"; // solo mas alto
const REVERSE_ON = "\x1D\x42\x01"; // blanco sobre negro
const REVERSE_OFF = "\x1D\x42\x00";
const CUT = "\n\n\n\n\x1D\x56\x01";

const dash = (width = WIDTH) => "-".repeat(width) + "\n";
const pad = (left: string, right: string, width = WIDTH) => left + " ".repeat(Math.max(1, width - left.length - right.length)) + right + "\n";
const moneyText = (value: number) => "$ " + Math.round(value).toLocaleString("es-UY");

// Corta un texto en renglones de "width" caracteres sin partir palabras.
function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

const KIND_LABEL = { salon: "Salón", delivery: "Delivery", retiro: "Retiro" } as const;
const PAYMENT_LABEL = { efectivo: "Efectivo", tarjeta: "POS", cuenta: "Cuenta corriente", transferencia: "Transferencia" } as const;

function dateText(iso: string) {
  return new Date(iso).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function timeText(iso: string) {
  return new Date(iso).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function lineBaseName(line: OrderLine) {
  return line.baseName ?? line.name;
}

export function buildClienteEscPos(order: Order): string[] {
  const out: string[] = [INIT, CENTER];
  // LOGO: cuando lo pasen, se imprime aca (QZ acepta imagen: { type: "image", data: url }).
  out.push(BOLD_ON + SIZE_DOUBLE + LOCAL_INFO.name + "\n" + SIZE_NORMAL + BOLD_OFF);
  const localLine = [LOCAL_INFO.address, LOCAL_INFO.phone].filter(Boolean).join(" · ");
  if (localLine) out.push(localLine + "\n");
  out.push(LEFT, dash());
  out.push(pad("Fecha: " + dateText(order.createdAt), "Hora: " + timeText(order.createdAt)));
  out.push(BOLD_ON + pad("Pedido #" + order.number, KIND_LABEL[order.kind]) + BOLD_OFF);
  if (order.clientName) out.push("Cliente: " + order.clientName + "\n");
  if (order.phone) out.push("Tel: " + order.phone + "\n");
  if (order.address) out.push("Dirección: " + order.address + "\n");
  out.push(dash());
  for (const line of order.lines) {
    const label = line.qty + " x " + line.name;
    const price = moneyText(line.price * line.qty);
    const rows = wrap(label, WIDTH - price.length - 1);
    rows.forEach((row, index) => out.push(index === rows.length - 1 ? pad(row, price) : row + "\n"));
    if (line.note) for (const row of wrap("  Nota: " + line.note, WIDTH)) out.push(row + "\n");
  }
  if (order.note) out.push(dash() + "Nota del pedido: " + order.note + "\n");
  out.push(dash());
  out.push(BOLD_ON + SIZE_DOUBLE + pad("TOTAL", moneyText(order.total), WIDTH / 2) + SIZE_NORMAL + BOLD_OFF);
  out.push("Pago: " + PAYMENT_LABEL[order.payment] + "\n");
  out.push(dash(), CENTER, BOLD_ON + "¡Gracias por su compra!\n" + BOLD_OFF, LEFT, dash(), CENTER, FOOTER_TEXT + "\n", CUT);
  return out;
}

export function buildComandaEscPos(order: Order): string[] {
  const out: string[] = [INIT, CENTER];
  out.push(REVERSE_ON + BOLD_ON + SIZE_DOUBLE + "  COMANDA  " + "\n" + SIZE_NORMAL + REVERSE_OFF);
  out.push(SIZE_TALL + "Pedido #" + order.number + " · " + KIND_LABEL[order.kind].toUpperCase() + "\n" + SIZE_NORMAL + BOLD_OFF);
  // 19/11/2026: hora del pedido en la comanda.
  out.push(BOLD_ON + SIZE_TALL + "Hora: " + timeText(order.createdAt) + "\n" + SIZE_NORMAL + BOLD_OFF);
  out.push(LEFT, dash());
  let count = 0;
  order.lines.forEach((line, index) => {
    count += line.qty;
    const rows = wrap(line.qty + "  " + lineBaseName(line).toUpperCase(), WIDTH / 2);
    out.push(BOLD_ON + SIZE_DOUBLE + rows.join("\n") + "\n" + SIZE_NORMAL + BOLD_OFF);
    // 20/11/2026 (pedido de la duena): si algo va SIN, la comanda muestra solo lo
    // que SI lleva ("CON ..." uno por renglon) y abajo, chico, lo que se saco.
    const detail = comandaDetail(line);
    if (detail) {
      for (const item of detail.con) out.push("   " + BOLD_ON + SIZE_TALL + "CON " + item + "\n" + SIZE_NORMAL + BOLD_OFF);
      for (const item of detail.added) out.push("   " + BOLD_ON + SIZE_TALL + "[+] " + item + "\n" + SIZE_NORMAL + BOLD_OFF);
      for (const row of wrap("(" + detail.note + ")", WIDTH - 3)) out.push("   " + row + "\n");
    } else {
      for (const item of line.removed ?? []) out.push("   " + REVERSE_ON + BOLD_ON + SIZE_TALL + " SIN " + REVERSE_OFF + " " + item + "\n" + SIZE_NORMAL + BOLD_OFF);
      for (const item of line.extras ?? []) out.push("   " + BOLD_ON + SIZE_TALL + "[+] " + item + "\n" + SIZE_NORMAL + BOLD_OFF);
    }
    // Nota de este producto (20/11/2026): bien visible para la cocina.
    if (line.note) {
      const rows = wrap(line.note, WIDTH / 2 - 7);
      rows.forEach((row, i) =>
        out.push("   " + (i === 0 ? REVERSE_ON + BOLD_ON + SIZE_TALL + " NOTA " + REVERSE_OFF + " " : "         " + BOLD_ON + SIZE_TALL) + row + "\n" + SIZE_NORMAL + BOLD_OFF)
      );
    }
    if (index < order.lines.length - 1) out.push(dash());
  });
  if (order.note) {
    out.push("\n" + "=".repeat(WIDTH) + "\n");
    out.push(BOLD_ON + "NOTA\n" + SIZE_TALL + order.note + "\n" + SIZE_NORMAL + BOLD_OFF);
    out.push("=".repeat(WIDTH) + "\n");
  }
  out.push(CENTER, BOLD_ON + "\n" + count + (count === 1 ? " producto" : " productos") + "\n" + BOLD_OFF, CUT);
  return out;
}

// ---------------- Imprimir ----------------
export type PrintResult = { mode: PrintMode; tickets: TicketKind[]; printer?: string };

// Imprime los tickets elegidos. En modo simulado no manda nada (la pantalla los
// muestra). En modo QZ, si falla tira un Error con un mensaje claro.
export async function printOrder(order: Order, copies: Copies): Promise<PrintResult> {
  const tickets = ticketsFor(copies);
  const mode = getPrintMode();

  await ensureQzConnected();
  // Si no se eligio impresora en "🖨 Impresora", usa la predeterminada de Windows.
  let printer = getPrinterName();
  if (!printer) {
    try {
      printer = await qz.printers.getDefault();
    } catch {
      printer = null;
    }
  }
  if (!printer) throw new Error("No hay impresora elegida. Tocá \"🖨 Impresora\" arriba y elegila.");
  const config = qz.configs.create(printer, { encoding: "CP437" });
  try {
    for (const ticket of tickets) {
      if (ticket === "cliente") {
        // 19/11/2026: ticket con el diseño de la dueña, como imagen. Si la
        // impresora no acepta la imagen, sale el ticket de texto de siempre.
        try {
          const png = await renderClienteTicketPng(order);
          await qz.print(config, [
            INIT,
            { type: "raw", format: "image", flavor: "base64", data: png, options: { language: "ESCPOS", dotDensity: "double" } },
            CUT
          ]);
        } catch {
          await qz.print(config, buildClienteEscPos(order).map(plainText));
        }
      } else {
        await qz.print(config, buildComandaEscPos(order).map(plainText));
      }
    }
  } catch (error) {
    throw new Error(`No se pudo imprimir en "${printer}". ${error instanceof Error ? error.message : ""}`.trim());
  }
  return { mode, tickets, printer };
}

// 19/11/2026: la termica imprimia "letras chinas" en vez de "¡" y vocales con
// tilde. Se mandan sin tilde (á -> a, ñ -> n) y sin "¡ ¿"; los comandos ESC/POS
// son ASCII y no se tocan.
function plainText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¡¿]/g, "")
    .replace(/[º°]/g, "o")
    .replace(/[·•]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x00-\x7F]/g, "");
}

// ---------------- Estado de cuenta (19/11/2026) ----------------
// "Reimprimir" en Cuenta corriente: ticket con los pedidos y pagos del cliente
// (los que tiene la app: desde el 1ro del mes pasado) y el saldo que debe.
export function buildEstadoCuentaEscPos(client: AccountClient, orders: Order[]): string[] {
  const out: string[] = [INIT, CENTER];
  out.push(BOLD_ON + SIZE_DOUBLE + LOCAL_INFO.name + "\n" + SIZE_NORMAL + BOLD_OFF);
  out.push(BOLD_ON + "ESTADO DE CUENTA\n" + BOLD_OFF);
  out.push(LEFT, dash());
  const now = new Date().toISOString();
  out.push(pad("Fecha: " + dateText(now), "Hora: " + timeText(now)));
  out.push(BOLD_ON + "Cliente: " + client.name + "\n" + BOLD_OFF);
  if (client.phone) out.push("Tel: " + client.phone + "\n");
  out.push(dash());
  const moves = [
    ...orders
      .filter((order) => order.clientId === client.id && order.payment === "cuenta" && order.status !== "rechazado")
      .map((order) => ({ date: order.createdAt, label: "Pedido #" + order.number, amount: moneyText(order.total) })),
    ...client.payments.map((payment) => ({ date: payment.date, label: "Pago", amount: "- " + moneyText(payment.amount) }))
  ].sort((a, b) => a.date.localeCompare(b.date));
  if (moves.length === 0) out.push("Sin movimientos.\n");
  for (const move of moves) out.push(pad(dateText(move.date) + "  " + move.label, move.amount));
  out.push(dash());
  out.push(BOLD_ON + SIZE_DOUBLE + pad("DEBE", moneyText(client.balance), WIDTH / 2) + SIZE_NORMAL + BOLD_OFF);
  out.push(dash(), CENTER, FOOTER_TEXT + "\n", CUT);
  return out;
}

export async function printAccountStatement(client: AccountClient, orders: Order[]): Promise<string> {
  await ensureQzConnected();
  let printer = getPrinterName();
  if (!printer) {
    try {
      printer = await qz.printers.getDefault();
    } catch {
      printer = null;
    }
  }
  if (!printer) throw new Error("No hay impresora elegida. Tocá \"🖨 Impresora\" arriba y elegila.");
  const config = qz.configs.create(printer, { encoding: "CP437" });
  try {
    await qz.print(config, buildEstadoCuentaEscPos(client, orders).map(plainText));
  } catch (error) {
    throw new Error(`No se pudo imprimir en "${printer}". ${error instanceof Error ? error.message : ""}`.trim());
  }
  return printer;
}
