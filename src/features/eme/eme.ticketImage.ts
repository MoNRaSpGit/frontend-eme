import type { Order } from "./eme.types";

// Ticket del cliente con el diseño de la dueña (19/11/2026): se dibuja en un
// canvas (logo, franja negra, iconos, recuadro del cliente) y se manda a la
// termica como imagen por QZ Tray. Ancho 576 puntos = papel de 80 mm.
export const TICKET_BRAND = {
  phone: "092455379",
  name1: "NUEVA PIZZERÍA",
  name2: "TACUAREMBÓ",
  band: ["PIZZAS • HAMBURGUESAS • MILANESAS", "CHIVITOS • TACOS • PICADAS"],
  thanks: "¡GRACIAS POR ELEGIRNOS!",
  sub: "Tu próxima comida favorita te espera.",
  instagram: "@NuevaPizzeriaTacuarembo",
  ours: ["USO INTERNO", "Sistema Logic Lab · 092 945 696"]
};

const WIDTH = 576;
const PAD = 22;
const FONT = '"Segoe UI", Arial, sans-serif';
const PAYMENT_TEXT = { efectivo: "Efectivo", tarjeta: "Tarjeta", cuenta: "Cuenta corriente" } as const;
const KIND_TEXT = { salon: "Mesa", delivery: "Delivery", retiro: "Retira en el local" } as const;

// ---------- iconos (dibujos en negro, viewBox 24x24) ----------
type Icon = (ctx: CanvasRenderingContext2D) => void;
const strokeIcon = (draw: (ctx: CanvasRenderingContext2D) => void): Icon => (ctx) => {
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000";
  draw(ctx);
};
const circle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill = false) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) ctx.fill();
  else ctx.stroke();
};
const WA_PATH =
  "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 0 1 12 4zm-3.3 3.5c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2c.2.2 2.2 3.4 5.4 4.6 2.6 1 3.2.8 3.7.8.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4l-.5-.3-1.9-.9c-.3-.1-.5-.2-.7.1l-.9 1.1c-.2.2-.3.2-.6.1-1.2-.5-2.6-1.3-3.6-3.2-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.5-.6-.5z";

const ICONS: Record<string, Icon> = {
  ticket: strokeIcon((ctx) => {
    ctx.stroke(new Path2D("M3 10a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V6H3z"));
    ctx.setLineDash([2, 2]);
    ctx.stroke(new Path2D("M9 8v8"));
    ctx.setLineDash([]);
  }),
  calendar: strokeIcon((ctx) => {
    ctx.strokeRect(3, 5, 18, 16);
    ctx.stroke(new Path2D("M3 10h18M8 3v4M16 3v4"));
  }),
  clock: strokeIcon((ctx) => {
    circle(ctx, 12, 12, 9);
    ctx.stroke(new Path2D("M12 7v5l3 2"));
  }),
  user: (ctx) => {
    circle(ctx, 12, 7, 4, true);
    ctx.fill(new Path2D("M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z"));
  },
  whatsapp: (ctx) => ctx.fill(new Path2D(WA_PATH), "evenodd"),
  pin: (ctx) => ctx.fill(new Path2D("M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"), "evenodd"),
  card: strokeIcon((ctx) => {
    ctx.strokeRect(2, 5, 20, 14);
    ctx.stroke(new Path2D("M2 10h20M6 15h4"));
  }),
  moto: (ctx) => {
    ctx.fillRect(2, 6, 6.5, 5);
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    circle(ctx, 5.5, 17.5, 2.6);
    circle(ctx, 18.5, 17.5, 2.6);
    ctx.stroke(new Path2D("M2.6 15c.6-1.9 2-3 4-3h3.4l1.6 4.5h4.2l2.6-8H16"));
    ctx.lineWidth = 2.2;
    ctx.stroke(new Path2D("M16 8.5h3.4"));
  },
  instagram: strokeIcon((ctx) => {
    ctx.stroke(new Path2D("M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5z"));
    circle(ctx, 12, 12, 4);
    circle(ctx, 17.5, 6.5, 0.9, true);
  })
};

function drawIcon(ctx: CanvasRenderingContext2D, name: keyof typeof ICONS, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = "#000";
  ICONS[name](ctx);
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function money(value: number) {
  return "$ " + Math.round(value).toLocaleString("es-UY");
}

// Corta un texto en renglones que entren en "maxWidth".
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const rows: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? current + " " + word : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      rows.push(current);
      current = word;
    } else current = next;
  }
  if (current) rows.push(current);
  return rows;
}

// Dibuja el ticket y devuelve el PNG en base64 (sin el prefijo data:).
export async function renderClienteTicketPng(order: Order): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = 3000;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo dibujar el ticket.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, WIDTH, canvas.height);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.textBaseline = "alphabetic";

  const center = WIDTH / 2;
  const left = PAD;
  const right = WIDTH - PAD;
  let y = 14;

  const text = (value: string, x: number, size: number, weight = 700, align: CanvasTextAlign = "left", italic = false, color = "#000") => {
    ctx.font = `${italic ? "italic " : ""}${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
    ctx.fillStyle = "#000";
  };
  const rule = (thickness = 2) => {
    ctx.fillRect(left, y, right - left, thickness);
  };

  // Logo
  const logo = await loadImage(import.meta.env.BASE_URL + "ticket-logo.png");
  if (logo) {
    const size = 290;
    const height = (logo.height / logo.width) * size;
    ctx.drawImage(logo, center - size / 2, y, size, height);
    y += height + 6;
  }

  // Telefono entre rayitas
  y += 30;
  ctx.font = `800 30px ${FONT}`;
  const phoneWidth = ctx.measureText(TICKET_BRAND.phone).width;
  text(TICKET_BRAND.phone, center, 30, 800, "center");
  ctx.fillRect(center - phoneWidth / 2 - 64, y - 11, 50, 3);
  ctx.fillRect(center + phoneWidth / 2 + 14, y - 11, 50, 3);

  y += 42;
  text(TICKET_BRAND.name1, center, 34, 900, "center");
  y += 50;
  text(TICKET_BRAND.name2, center, 50, 900, "center");

  // Franja negra
  y += 16;
  const bandHeight = 66;
  ctx.fillRect(left + 8, y, right - left - 16, bandHeight);
  y += 27;
  text(TICKET_BRAND.band[0], center, 19, 800, "center", true, "#fff");
  y += 27;
  text(TICKET_BRAND.band[1], center, 19, 800, "center", true, "#fff");
  y += 24;

  // Ticket, fecha y hora
  rule();
  const created = new Date(order.createdAt);
  const date = created.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = created.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", hour12: false }) + " hs";
  y += 30;
  drawIcon(ctx, "ticket", left, y - 22, 28);
  text("Ticket N.º " + String(order.number).padStart(6, "0"), left + 34, 23, 800);
  text(date, right, 20, 700, "right");
  ctx.font = `700 20px ${FONT}`;
  drawIcon(ctx, "calendar", right - ctx.measureText(date).width - 28, y - 18, 22);
  y += 26;
  text(time, right, 20, 700, "right");
  drawIcon(ctx, "clock", right - ctx.measureText(time).width - 28, y - 18, 22);
  y += 14;

  // Recuadro del cliente (solo si hay datos)
  const clientRows: { icon: keyof typeof ICONS; label: string; value: string }[] = [];
  if (order.clientName) clientRows.push({ icon: "user", label: "Cliente:", value: order.clientName });
  if (order.phone) clientRows.push({ icon: "whatsapp", label: "Teléfono:", value: order.phone });
  if (order.address) clientRows.push({ icon: "pin", label: "Dirección:", value: order.address });
  if (clientRows.length) {
    const boxTop = y;
    const boxHeight = 18 + clientRows.length * 30;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left, boxTop, right - left, boxHeight, 12);
    ctx.stroke();
    y += 34;
    for (const row of clientRows) {
      drawIcon(ctx, row.icon, left + 16, y - 19, 22);
      text(row.label, left + 46, 20, 800);
      ctx.font = `800 20px ${FONT}`;
      const labelWidth = ctx.measureText(row.label + " ").width;
      text(row.value, left + 46 + labelWidth, 20, 400);
      y += 30;
    }
    y = boxTop + boxHeight + 12;
  }

  // Detalle
  rule();
  y += 30;
  text("DETALLE DEL PEDIDO", center, 22, 900, "center");
  y += 6;
  for (const line of order.lines) {
    ctx.font = `600 20px ${FONT}`;
    const price = money(line.price * line.qty);
    const rows = wrapText(ctx, line.name, right - left - 50 - ctx.measureText(price).width - 16);
    rows.forEach((row, index) => {
      y += 29;
      if (index === 0) text(String(line.qty), left + 6, 20, 600);
      text(row, left + 40, 20, 600);
      if (index === 0) text(price, right - 4, 20, 700, "right");
    });
  }
  if (order.note) {
    ctx.font = `italic 400 18px ${FONT}`;
    for (const row of wrapText(ctx, "Nota: " + order.note, right - left - 40)) {
      y += 26;
      text(row, left + 40, 18, 400, "left", true);
    }
  }
  y += 16;
  rule(3);
  y += 50;
  text("TOTAL", left + 4, 44, 900);
  text(money(order.total), right - 4, 44, 900, "right");
  y += 16;
  rule(3);

  // Pago y entrega
  y += 32;
  drawIcon(ctx, "card", left + 8, y - 19, 22);
  text("Forma de pago:", left + 40, 19, 800);
  ctx.font = `800 19px ${FONT}`;
  text(PAYMENT_TEXT[order.payment], left + 40 + ctx.measureText("Forma de pago: ").width, 19, 400);
  y += 31;
  drawIcon(ctx, "moto", left + 6, y - 22, 28);
  text("Entrega:", left + 40, 19, 800);
  ctx.font = `800 19px ${FONT}`;
  text(KIND_TEXT[order.kind], left + 40 + ctx.measureText("Entrega: ").width, 19, 400);
  y += 16;
  rule();

  // Cierre
  y += 40;
  text(TICKET_BRAND.thanks, center, 28, 900, "center", true);
  y += 28;
  text(TICKET_BRAND.sub, center, 18, 600, "center");
  y += 52;
  ctx.font = `900 40px ${FONT}`;
  const phoneW = ctx.measureText(TICKET_BRAND.phone).width;
  drawIcon(ctx, "whatsapp", center - (phoneW + 52) / 2, y - 38, 44);
  text(TICKET_BRAND.phone, center - (phoneW + 52) / 2 + 52, 40, 900);
  y += 38;
  ctx.font = `800 22px ${FONT}`;
  const igW = ctx.measureText(TICKET_BRAND.instagram).width;
  drawIcon(ctx, "instagram", center - (igW + 34) / 2, y - 21, 26);
  text(TICKET_BRAND.instagram, center - (igW + 34) / 2 + 34, 22, 800);

  // Nuestro pie
  y += 22;
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 26;
  text(TICKET_BRAND.ours[0], center, 16, 700, "center");
  y += 22;
  text(TICKET_BRAND.ours[1], center, 16, 700, "center");
  y += 24;

  // Recorta al alto usado
  const out = document.createElement("canvas");
  out.width = WIDTH;
  out.height = Math.ceil(y);
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("No se pudo dibujar el ticket.");
  outCtx.drawImage(canvas, 0, 0);
  return out.toDataURL("image/png").split(",")[1];
}
