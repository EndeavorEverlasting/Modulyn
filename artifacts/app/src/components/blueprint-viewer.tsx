import { useRef } from "react";
import { Component3D } from "@workspace/api-client-react";
import { Download } from "lucide-react";

interface BlueprintViewerProps {
  components: Component3D[];
  overallWidth?: number;
  overallHeight?: number;
  overallDepth?: number;
  unit?: string;
  designName?: string;
}

const ARROW = 3;
const DIM_GAP = 6;
const DIM_EXTRA = 4;

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

interface DimLineHProps {
  x1: number; x2: number;
  y: number;
  dir?: -1 | 1;
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
  dir?: -1 | 1;
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

function buildCompositeSVG(
  frontEl: SVGSVGElement,
  topEl: SVGSVGElement,
  sideEl: SVGSVGElement,
  designName: string,
  W: number,
  H: number,
  D: number,
  unit: string,
): string {
  const ser = new XMLSerializer();

  // Extract inner markup of each SVG (we'll re-embed with their viewBoxes)
  const fvb = frontEl.getAttribute("viewBox") || "0 0 100 100";
  const tvb = topEl.getAttribute("viewBox") || "0 0 100 100";
  const svb = sideEl.getAttribute("viewBox") || "0 0 100 100";

  const fInner = frontEl.innerHTML;
  const tInner = topEl.innerHTML;
  const sInner = sideEl.innerHTML;

  const panelW = 260;
  const panelH = 220;
  const gap = 20;
  const topMargin = 40;
  const totalW = panelW * 3 + gap * 2;
  const totalH = topMargin + panelH + 60;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="${totalW}" height="${totalH}" fill="#050505"/>

  <text x="${totalW / 2}" y="16" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#eab308">${designName.toUpperCase()}</text>
  <text x="${totalW / 2}" y="30" text-anchor="middle" font-family="monospace" font-size="7" fill="#555">ENGINEERING BLUEPRINT — ALL DIMENSIONS IN ${unit.toUpperCase()}</text>

  <!-- Front View -->
  <text x="${panelW / 2}" y="${topMargin - 6}" text-anchor="middle" font-family="monospace" font-size="7" fill="#888">FRONT — W × H</text>
  <rect x="0" y="${topMargin}" width="${panelW}" height="${panelH}" fill="none" stroke="#222" stroke-width="0.5"/>
  <svg x="0" y="${topMargin}" width="${panelW}" height="${panelH}" viewBox="${fvb}">${fInner}</svg>

  <!-- Top View -->
  <text x="${panelW + gap + panelW / 2}" y="${topMargin - 6}" text-anchor="middle" font-family="monospace" font-size="7" fill="#888">TOP — W × D</text>
  <rect x="${panelW + gap}" y="${topMargin}" width="${panelW}" height="${panelH}" fill="none" stroke="#222" stroke-width="0.5"/>
  <svg x="${panelW + gap}" y="${topMargin}" width="${panelW}" height="${panelH}" viewBox="${tvb}">${tInner}</svg>

  <!-- Side View -->
  <text x="${panelW * 2 + gap * 2 + panelW / 2}" y="${topMargin - 6}" text-anchor="middle" font-family="monospace" font-size="7" fill="#888">SIDE — D × H</text>
  <rect x="${panelW * 2 + gap * 2}" y="${topMargin}" width="${panelW}" height="${panelH}" fill="none" stroke="#222" stroke-width="0.5"/>
  <svg x="${panelW * 2 + gap * 2}" y="${topMargin}" width="${panelW}" height="${panelH}" viewBox="${svb}">${sInner}</svg>

  <!-- Dimension summary -->
  <text x="${totalW / 2}" y="${topMargin + panelH + 22}" text-anchor="middle" font-family="monospace" font-size="8" fill="#eab308">
    W: ${fmt(W)}"  ×  H: ${fmt(H)}"  ×  D: ${fmt(D)}"
  </text>
  <text x="${totalW / 2}" y="${topMargin + panelH + 36}" text-anchor="middle" font-family="monospace" font-size="6" fill="#444">
    Generated by VoiceCAD
  </text>
</svg>`;
}

export function BlueprintViewer({
  components,
  overallWidth,
  overallHeight,
  overallDepth,
  unit = "inches",
  designName = "Design",
}: BlueprintViewerProps) {
  const svgFrontRef = useRef<SVGSVGElement>(null);
  const svgTopRef = useRef<SVGSVGElement>(null);
  const svgSideRef = useRef<SVGSVGElement>(null);

  if (!components.length) {
    return <div className="text-muted-foreground p-4 font-mono text-sm">No components to display</div>;
  }

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

  const pad = 30;
  const dimOff = 18;

  const fvVb = [minX - pad, -maxY - pad, W + pad * 2, H + pad * 2].join(" ");
  const tvVb = [minX - pad, minZ - pad, W + pad * 2, D + pad * 2].join(" ");
  const svVb = [minZ - pad, -maxY - pad, D + pad * 2, H + pad * 2].join(" ");

  const slug = designName.toLowerCase().replace(/\s+/g, "-");

  const handleDownloadSVG = () => {
    const f = svgFrontRef.current;
    const t = svgTopRef.current;
    const s = svgSideRef.current;
    if (!f || !t || !s) return;

    const svgString = buildCompositeSVG(f, t, s, designName, W, H, D, unit);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-blueprint.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = () => {
    const f = svgFrontRef.current;
    const t = svgTopRef.current;
    const s = svgSideRef.current;
    if (!f || !t || !s) return;

    const svgString = buildCompositeSVG(f, t, s, designName, W, H, D, unit);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    const scale = 2; // 2× for retina quality
    const panelW = 260;
    const panelH = 220;
    const gap = 20;
    const topMargin = 40;
    const totalW = (panelW * 3 + gap * 2) * scale;
    const totalH = (topMargin + panelH + 60) * scale;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, totalW, totalH);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `${slug}-blueprint.png`;
      a.click();
    };
    img.src = url;
  };

  const svgClass = "w-full max-h-64 border border-border bg-[#050505]";
  const viewLabelClass = "font-mono text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider border-b border-border pb-1";

  return (
    <div className="flex flex-col h-full" data-testid="blueprint-viewer">
      {/* Export toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-[#0a0a0a] flex-shrink-0">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          Blueprint Export
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadSVG}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-black border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors font-mono text-[10px] uppercase tracking-wide"
            data-testid="btn-download-svg"
            title="Download as SVG vector file"
          >
            <Download className="w-3 h-3" /> SVG
          </button>
          <button
            onClick={handleDownloadPNG}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-black border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors font-mono text-[10px] uppercase tracking-wide"
            data-testid="btn-download-png"
            title="Download as PNG image"
          >
            <Download className="w-3 h-3" /> PNG
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-4 overflow-y-auto flex-1">
        {/* FRONT VIEW */}
        <div>
          <p className={viewLabelClass}>Front View — W × H</p>
          <svg ref={svgFrontRef} viewBox={fvVb} className={svgClass}>
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
            <DimLineH x1={minX} x2={maxX} y={-minY + dimOff} dir={1} label={fmt(W)} color="#eab308" />
            <DimLineV y1={-maxY} y2={-minY} x={maxX + dimOff} dir={1} label={fmt(H)} color="#eab308" />
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
          <svg ref={svgTopRef} viewBox={tvVb} className={svgClass}>
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
            <DimLineH x1={minX} x2={maxX} y={maxZ + dimOff} dir={1} label={fmt(W)} color="#eab308" />
            <DimLineV y1={minZ} y2={maxZ} x={maxX + dimOff} dir={1} label={fmt(D)} color="#eab308" />
          </svg>
        </div>

        {/* SIDE VIEW */}
        <div>
          <p className={viewLabelClass}>Side View — D × H</p>
          <svg ref={svgSideRef} viewBox={svVb} className={svgClass}>
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
            <DimLineH x1={minZ} x2={maxZ} y={-minY + dimOff} dir={1} label={fmt(D)} color="#eab308" />
            <DimLineV y1={-maxY} y2={-minY} x={maxZ + dimOff} dir={1} label={fmt(H)} color="#eab308" />
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
    </div>
  );
}
