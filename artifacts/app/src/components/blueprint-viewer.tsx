import { Component3D } from "@workspace/api-client-react/src/generated/api.schemas";

interface BlueprintViewerProps {
  components: Component3D[];
}

export function BlueprintViewer({ components }: BlueprintViewerProps) {
  if (!components.length) return <div className="text-muted-foreground p-4">No components to display</div>;

  // Calculate bounding box
  let minX = 0, minY = 0, minZ = 0, maxX = 0, maxY = 0, maxZ = 0;
  components.forEach(c => {
    minX = Math.min(minX, c.x - c.width / 2);
    maxX = Math.max(maxX, c.x + c.width / 2);
    minY = Math.min(minY, c.y - c.height / 2);
    maxY = Math.max(maxY, c.y + c.height / 2);
    minZ = Math.min(minZ, c.z - c.depth / 2);
    maxZ = Math.max(maxZ, c.z + c.depth / 2);
  });

  const width = maxX - minX || 10;
  const height = maxY - minY || 10;
  const depth = maxZ - minZ || 10;

  const padding = 20;

  return (
    <div className="flex flex-col gap-8 p-4 overflow-y-auto h-full" data-testid="blueprint-viewer">
      <div>
        <h3 className="font-mono text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider border-b border-border pb-2">Front View</h3>
        <svg viewBox={`${minX - padding} ${-maxY - padding} ${width + padding * 2} ${height + padding * 2}`} className="w-full max-h-64 border border-border bg-[#0a0a0a]">
          {components.map((c, i) => (
            <rect key={`front-${i}`} x={c.x - c.width / 2} y={-(c.y + c.height / 2)} width={c.width} height={c.height} fill="transparent" stroke={c.color || "#eab308"} strokeWidth="1" />
          ))}
        </svg>
      </div>

      <div>
        <h3 className="font-mono text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider border-b border-border pb-2">Top View</h3>
        <svg viewBox={`${minX - padding} ${minZ - padding} ${width + padding * 2} ${depth + padding * 2}`} className="w-full max-h-64 border border-border bg-[#0a0a0a]">
          {components.map((c, i) => (
            <rect key={`top-${i}`} x={c.x - c.width / 2} y={c.z - c.depth / 2} width={c.width} height={c.depth} fill="transparent" stroke={c.color || "#eab308"} strokeWidth="1" />
          ))}
        </svg>
      </div>
      
      <div>
        <h3 className="font-mono text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider border-b border-border pb-2">Side View</h3>
        <svg viewBox={`${minZ - padding} ${-maxY - padding} ${depth + padding * 2} ${height + padding * 2}`} className="w-full max-h-64 border border-border bg-[#0a0a0a]">
          {components.map((c, i) => (
            <rect key={`side-${i}`} x={c.z - c.depth / 2} y={-(c.y + c.height / 2)} width={c.depth} height={c.height} fill="transparent" stroke={c.color || "#eab308"} strokeWidth="1" />
          ))}
        </svg>
      </div>
    </div>
  );
}