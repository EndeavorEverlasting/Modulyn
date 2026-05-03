import { Component3D } from "@workspace/api-client-react";

interface BlueprintViewerProps {
  components: Component3D[];
  overallWidth?: number;
  overallHeight?: number;
  overallDepth?: number;
  unit?: string;
}

const ARROW = 3; // arrowhead size in SVG units
const DIM_GAP = 6; // gap between shape edge and dimension line
const DIM_EXTRA = 4; // extra extension beyond the dim line

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

interface DimLineHProps {
  x1: number; x2: number;
  y: number;        // shape edge Y
  dir?: -1 | 1;    // 1 = below, -1 = above
  label: string;
  color?: string;
}

function DimLineH({ x1, x2, y, dir = 1, label, color = "#eab308" }: DimLineHProps) {
  const dimY = y + dir * (DIM_GAP + ARROW + 2);
  const extY1 = y + dir * DIM_GAP;
  const extY2 = y + dir * (DIM_GAP + ARROW * 2 + DIM_EXTRA);
  const mx = (x1 + x2) / 2;

  const arrowL = x1 < x2
    ? `M${x1},${dimY} L${x1 + ARROW * 1.5},${dimY - ARROW / 2} L${x1 + ARROW * 1.5},${dimY + ARROW / 2} Z`
    : `M${x1},${dimY} L${x1 - ARROW * 1.5},${dimY - ARROW / 2} L${x1 - ARROW * 1.5},${dimY + ARROW / 2} Z`;
  const arrowR = x2 > x1
    ? `M${x2},${dimY} L${x2 - ARROW * 1.5},${dimY - ARROW / 2} L${x2 - ARROW * 1.5},${dimY + ARROW / 2} Z`
    : `M${x2},${dimY} L${x2 + ARROW * 1.5},${dimY - ARROW / 2} L${x2 + ARROW * 1.5},${dimY + ARROW / 2} Z`;

  return (
    <g stroke={color} fill={color} strokeWidth={0.5}>
      <line x1={x1} y1={extY1} x2={x1} y2={extY2} />
      <line x1={x2} y1={extY1} x2={x2} y2={extY2} />
      <line x1={x1 + (x1 < x2 ? ARROW * 1.5 : -ARROW * 1.5)} y1={dimY} x2={x2 + (x2 > x1 ? -ARROW * 1.5 : ARROW * 1.5)} y2={dimY} />
      <path d={arrowL} stroke="none" />
      <path d={arrowR} stroke="none" />
      <text x={mx} y={dimY + dir * 5.5} textAnchor="middle" fontSize={5.5} stroke="none" fill={color} fontFamily="monospace">{label}"</text>
    </g>
  );
}

interface DimLineVProps {
  y1: number; y2: number;
  x: number;
  dir?: -1 | 1;    // 1 = right, -1 = left
  label: string;
  color?: string;
}

function DimLineV({ y1, y2, x, dir = 1, label, color = "#eab308" }: DimLineVProps) {
  const dimX = x + dir * (DIM_GAP + ARROW + 2);
  const extX1 = x + dir * DIM_GAP;
  const extX2 = x + dir * (DIM_GAP + ARROW * 2 + DIM_EXTRA);
  const my = (y1 + y2) / 2;

  const arrowT = `M${dimX},${y1 < y2 ? y1 : y2} L${dimX - ARROW / 2},${(y1 < y2 ? y1 : y2) + ARROW * 1.5} L${dimX + ARROW / 2},${(y1 < y2 ? y1 : y2) + ARROW * 1.5} Z`;
  const arrowB = `M${dimX},${y1 > y2 ? y1 : y2} L${dimX - ARROW / 2},${(y1 > y2 ? y1 : y2) - ARROW * 1.5} L${dimX + ARROW / 2},${(y1 > y2 ? y1 : y2) - ARROW * 1.5} Z`;

  return (
    <g stroke={color} fill={color} strokeWidth={0.5}>
      <line x1={extX1} y1={y1} x2={extX2} y2={y1} />
      <line x1={extX1} y1={y2} x2={extX2} y2={y2} />
      <line x1={dimX} y1={Math.min(y1, y2) + ARROW * 1.5} x2={dimX} y2={Math.max(y1, y2) - ARROW * 1.5} />
      <path d={arrowT} stroke="none" />
      <path d={arrowB} stroke="none" />
      <text
        x={dimX + dir * 5.5}
        y={my + 2}
        textAnchor="middle"
        fontSize={5.5}
        stroke="none"
        fill={color}
        fontFamily="monospace"
        transform={`rotate(-90, ${dimX + dir * 5.5}, ${my + 2})`}
      >
        {label}"
      </text>
    </g>
  );
}

export function BlueprintViewer({
  components,
  overallWidth,
  overallHeight,
  overallDepth,
  unit = "inches",
}: BlueprintViewerProps) {
  if (!components.length) {
    return <div className="text-muted-foreground p-4 font-mono text-sm">No components to display</div>;
  }

  // Derive bounding box from components if overall not supplied
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  components.forEach((c) => {
    minX = Math.min(minX, c.x - c.width / 2);
    maxX = Math.max(maxX, c.x + c.width / 2);
    minY = Math.min(minY, c.y - c.height / 2);
    maxY = Math.max(maxY, c.y + c.height / 2);
    minZ = Math.min(minZ, c.z - c.depth / 2);
    maxZ = Math.max(maxZ, c.z + c.depth / 2);
  });

  const W = (overallWidth ?? (maxX - minX)) || 10;
  const H = (overallHeight ?? (maxY - minY)) || 10;
  const D = (overallDepth ?? (maxZ - minZ)) || 10;

  const pad = 30; // padding around drawing for dimension lines
  const dimOff = 18; // dimension line offset from shape

  // ─── FRONT VIEW (X-Y plane, Z ignored) ────────────────────────────────────
  // shapes: rect at (cx - w/2, -(cy + h/2)), width=w, height=h
  // bounding rect overall: x: [minX, maxX], y: [-maxY, -minY]
  const fvVb = [
    minX - pad,
    -maxY - pad,
    W + pad * 2,
    H + pad * 2,
  ].join(" ");

  // ─── TOP VIEW (X-Z plane, Y ignored) ────────────────────────────────────
  const tvVb = [
    minX - pad,
    minZ - pad,
    W + pad * 2,
    D + pad * 2,
  ].join(" ");

  // ─── SIDE VIEW (Z-Y plane, X ignored) ────────────────────────────────────
  const svVb = [
    minZ - pad,
    -maxY - pad,
    D + pad * 2,
    H + pad * 2,
  ].join(" ");

  const svgClass = "w-full max-h-64 border border-border bg-[#050505]";
  const viewLabelClass = "font-mono text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider border-b border-border pb-1";

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full" data-testid="blueprint-viewer">

      {/* FRONT VIEW */}
      <div>
        <p className={viewLabelClass}>Front View — W × H</p>
        <svg viewBox={fvVb} className={svgClass}>
          {/* Components */}
          {components.map((c, i) => (
            <rect
              key={`f-${i}`}
              x={c.x - c.width / 2}
              y={-(c.y + c.height / 2)}
              width={c.width}
              height={c.height}
              fill="rgba(234,179,8,0.06)"
              stroke={c.color || "#eab308"}
              strokeWidth={0.8}
            />
          ))}
          {/* Per-component W dimension (only label for large enough comps) */}
          {components.filter((c) => c.width >= W * 0.2).map((c, i) => (
            <DimLineH
              key={`fw-${i}`}
              x1={c.x - c.width / 2}
              x2={c.x + c.width / 2}
              y={-(c.y - c.height / 2)}
              dir={1}
              label={fmt(c.width)}
              color="rgba(234,179,8,0.5)"
            />
          ))}
          {/* Overall W dimension */}
          <DimLineH
            x1={minX}
            x2={maxX}
            y={-minY + dimOff}
            dir={1}
            label={fmt(W)}
            color="#eab308"
          />
          {/* Overall H dimension */}
          <DimLineV
            y1={-maxY}
            y2={-minY}
            x={maxX + dimOff}
            dir={1}
            label={fmt(H)}
            color="#eab308"
          />
          {/* Component name labels */}
          {components.map((c, i) => (
            <text
              key={`fl-${i}`}
              x={c.x}
              y={-(c.y) + 2}
              textAnchor="middle"
              fontSize={Math.min(4, c.width / c.name.length * 1.5)}
              fill="rgba(255,255,255,0.4)"
              fontFamily="monospace"
            >
              {c.name}
            </text>
          ))}
        </svg>
      </div>

      {/* TOP VIEW */}
      <div>
        <p className={viewLabelClass}>Top View — W × D</p>
        <svg viewBox={tvVb} className={svgClass}>
          {components.map((c, i) => (
            <rect
              key={`t-${i}`}
              x={c.x - c.width / 2}
              y={c.z - c.depth / 2}
              width={c.width}
              height={c.depth}
              fill="rgba(234,179,8,0.06)"
              stroke={c.color || "#eab308"}
              strokeWidth={0.8}
            />
          ))}
          {/* Overall W dimension */}
          <DimLineH
            x1={minX}
            x2={maxX}
            y={maxZ + dimOff}
            dir={1}
            label={fmt(W)}
            color="#eab308"
          />
          {/* Overall D dimension */}
          <DimLineV
            y1={minZ}
            y2={maxZ}
            x={maxX + dimOff}
            dir={1}
            label={fmt(D)}
            color="#eab308"
          />
        </svg>
      </div>

      {/* SIDE VIEW */}
      <div>
        <p className={viewLabelClass}>Side View — D × H</p>
        <svg viewBox={svVb} className={svgClass}>
          {components.map((c, i) => (
            <rect
              key={`s-${i}`}
              x={c.z - c.depth / 2}
              y={-(c.y + c.height / 2)}
              width={c.depth}
              height={c.height}
              fill="rgba(234,179,8,0.06)"
              stroke={c.color || "#eab308"}
              strokeWidth={0.8}
            />
          ))}
          {/* Overall D dimension */}
          <DimLineH
            x1={minZ}
            x2={maxZ}
            y={-minY + dimOff}
            dir={1}
            label={fmt(D)}
            color="#eab308"
          />
          {/* Overall H dimension */}
          <DimLineV
            y1={-maxY}
            y2={-minY}
            x={maxZ + dimOff}
            dir={1}
            label={fmt(H)}
            color="#eab308"
          />
        </svg>
      </div>

      {/* Dimension Summary */}
      <div className="border border-border bg-[#0a0a0a] p-3 font-mono text-xs text-muted-foreground">
        <span className="text-primary font-bold">OVERALL</span>
        {" — "}
        <span className="text-foreground">W: {fmt(W)}" × H: {fmt(H)}" × D: {fmt(D)}"</span>
        <span className="ml-3 text-zinc-600">({unit})</span>
      </div>
    </div>
  );
}
