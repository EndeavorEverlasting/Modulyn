import * as THREE from "three";
import { STLExporter } from "three/addons/exporters/STLExporter.js";

interface Component3D {
  name: string;
  material: string;
  quantity: number;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
  color?: string;
  shape?: "box" | "cylinder" | "sphere";
}

export function exportComponentsAsSTL(
  components: Component3D[],
  filename: string = "design"
): void {
  const group = new THREE.Group();
  const SCALE = 0.5;

  const expanded: Component3D[] = [];
  components.forEach((comp) => {
    const qty = Math.max(1, comp.quantity || 1);
    for (let i = 0; i < qty; i++) {
      const spacing = comp.width + 2;
      expanded.push({
        ...comp,
        x: comp.x + (i - Math.floor(qty / 2)) * spacing,
        quantity: 1,
      });
    }
  });

  expanded.forEach((comp) => {
    let geo: THREE.BufferGeometry;
    const shape = comp.shape || "box";
    if (shape === "cylinder") {
      const r = (Math.max(comp.width, comp.depth) / 2) * SCALE;
      geo = new THREE.CylinderGeometry(r, r, comp.height * SCALE, 32);
    } else if (shape === "sphere") {
      const r = (Math.max(comp.width, comp.height, comp.depth) / 2) * SCALE;
      geo = new THREE.SphereGeometry(r, 32, 32);
    } else {
      geo = new THREE.BoxGeometry(
        comp.width * SCALE,
        comp.height * SCALE,
        comp.depth * SCALE
      );
    }

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: comp.color || "#eab308" })
    );
    mesh.position.set(comp.x * SCALE, comp.y * SCALE, comp.z * SCALE);
    group.add(mesh);
  });

  const exporter = new STLExporter();
  const stlString = exporter.parse(group, { binary: false });

  const blob = new Blob([stlString], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.stl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
