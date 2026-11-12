import { money } from "../eme.format";

// Mismo estilo que el grafico de frontend-distribuidora / joker: linea suave
// con area y puntos que muestran el sube y baja (pedido explicito: "igualita
// a la de la distribuidora").
export type DayPoint = { day: number; total: number; isToday: boolean };

const WIDTH = 640;
const HEIGHT = 230;
const PAD_X = 28;
const PAD_TOP = 40;
const PAD_BOTTOM = 32;
const COLOR = "#ff6b35";

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const midX = (a.x + b.x) / 2;
    path += ` C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
  }
  return path;
}

function compact(value: number) {
  return value >= 1000 ? "$" + (value / 1000).toFixed(1).replace(".0", "") + "k" : "$" + Math.round(value);
}

export function SalesLineChart({ points: data }: { points: DayPoint[] }) {
  const max = Math.max(...data.map((item) => item.total), 1);
  const usableWidth = WIDTH - PAD_X * 2;
  const usableHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const points = data.map((item, index) => ({
    ...item,
    x: data.length === 1 ? PAD_X + usableWidth / 2 : PAD_X + (index / (data.length - 1)) * usableWidth,
    y: PAD_TOP + usableHeight - (item.total / max) * usableHeight
  }));

  const line = smoothPath(points);
  const area = `${line} L ${points[points.length - 1].x} ${PAD_TOP + usableHeight} L ${points[0].x} ${PAD_TOP + usableHeight} Z`;
  // Con muchos dias, el monto va solo en algunos puntos para que no se pisen.
  const labelEvery = data.length > 16 ? 3 : data.length > 9 ? 2 : 1;

  return (
    <div className="line-chart-scroll">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="line-chart" role="img" aria-label="Ventas por día del mes">
        <defs>
          <linearGradient id="eme-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR} stopOpacity="0.32" />
            <stop offset="100%" stopColor={COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = PAD_TOP + usableHeight * fraction;
          return <line key={fraction} x1={PAD_X} y1={y} x2={WIDTH - PAD_X} y2={y} className="lc-grid" />;
        })}

        <path d={area} fill="url(#eme-line-fill)" stroke="none" />
        <path d={line} fill="none" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round" />

        {points.map((p, index) => (
          <g key={p.day}>
            {p.total > 0 && (index % labelEvery === 0 || p.isToday) && (
              <text x={p.x} y={p.y - 11} textAnchor="middle" className="lc-value">
                {compact(p.total)}
              </text>
            )}
            <circle cx={p.x} cy={p.y} r={p.isToday ? 5 : 3.8} fill="#fff" stroke={COLOR} strokeWidth="2.5" />
            <title>
              Día {p.day}: {money(p.total)}
            </title>
            <text x={p.x} y={HEIGHT - 10} textAnchor="middle" className={p.isToday ? "lc-label today" : "lc-label"}>
              {p.isToday ? "Hoy" : p.day}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
