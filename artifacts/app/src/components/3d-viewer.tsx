import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

// ─── 2D Isometric Fallback ────────────────────────────────────────────────────

function IsometricViewer({ components }: { components: Component3D[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);

    const SCALE = 0.55;
    const ISO_X = 0.866; // cos(30deg)
    const ISO_Y = 0.5;   // sin(30deg)
    const cx = W / 2;
    const cy = H * 0.55;

    // project 3d world → isometric 2d
    const project = (x: number, y: number, z: number) => ({
      px: cx + (x - z) * ISO_X * SCALE,
      py: cy + (x + z) * ISO_Y * SCALE - y * SCALE,
    });

    // draw grid
    ctx.strokeStyle = "#1e1e1e";
    ctx.lineWidth = 0.5;
    for (let i = -80; i <= 80; i += 10) {
      const a = project(i, 0, -80);
      const b = project(i, 0, 80);
      const c = project(-80, 0, i);
      const d = project(80, 0, i);
      ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.px, c.py); ctx.lineTo(d.px, d.py); ctx.stroke();
    }

    if (components.length === 0) {
      ctx.fillStyle = "#333";
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("NO COMPONENTS", cx, cy);
      return;
    }

    // sort components back-to-front for painter's algorithm
    const sorted = [...components].sort((a, b) => (a.x + a.z) - (b.x + b.z));

    sorted.forEach((comp) => {
      const baseColor = comp.color || "#eab308";
      const { x, y, z } = comp;
      const hw = comp.width / 2;
      const hh = comp.height / 2;
      const hd = comp.depth / 2;

      // hex color → rgb components for shading
      const hex = baseColor.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);

      const shade = (factor: number) =>
        `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;

      // 8 corners
      const tbl = project(x - hw, y + hh, z - hd);
      const tbr = project(x + hw, y + hh, z - hd);
      const tfl = project(x - hw, y + hh, z + hd);
      const tfr = project(x + hw, y + hh, z + hd);
      const bbl = project(x - hw, y - hh, z - hd);
      const bbr = project(x + hw, y - hh, z - hd);
      const bfl = project(x - hw, y - hh, z + hd);
      const bfr = project(x + hw, y - hh, z + hd);

      const drawFace = (pts: Array<{ px: number; py: number }>, color: string) => {
        ctx.beginPath();
        ctx.moveTo(pts[0].px, pts[0].py);
        pts.slice(1).forEach((p) => ctx.lineTo(p.px, p.py));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      };

      // top face (lightest)
      drawFace([tbl, tbr, tfr, tfl], shade(1.0));
      // left face
      drawFace([tfl, tfr, bfr, bfl], shade(0.65));
      // right face
      drawFace([tbr, tfr, bfr, bbr], shade(0.45));
    });

    // axis labels
    ctx.fillStyle = "#555";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    const xLabel = project(85, 0, 0);
    const zLabel = project(0, 0, 85);
    ctx.fillText("X", xLabel.px, xLabel.py);
    ctx.fillText("Z", zLabel.px, zLabel.py);
  }, [components]);

  return (
    <div className="w-full h-full relative" data-testid="3d-viewer-iso">
      <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: "300px" }} />
      <div className="absolute bottom-2 right-3 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
        Isometric View
      </div>
    </div>
  );
}

// ─── WebGL Viewer ─────────────────────────────────────────────────────────────

function WebGLViewer({ components }: { components: Component3D[] }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0a0a0a");
    scene.fog = new THREE.Fog("#0a0a0a", 300, 600);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(80, 60, 80);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(50, 80, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xeab308, 0.2);
    fillLight.position.set(-40, 20, -40);
    scene.add(fillLight);

    const gridHelper = new THREE.GridHelper(200, 40, "#333333", "#222222");
    scene.add(gridHelper);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 10;
    controls.maxDistance = 400;

    const SCALE = 0.5;
    components.forEach((comp) => {
      const color = comp.color || "#eab308";
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.7,
        metalness: comp.material?.toLowerCase().includes("steel") ? 0.6 : 0.1,
      });
      let geo: THREE.BufferGeometry;
      const shape = comp.shape || "box";
      if (shape === "cylinder") {
        const r = (Math.max(comp.width, comp.depth) / 2) * SCALE;
        geo = new THREE.CylinderGeometry(r, r, comp.height * SCALE, 32);
      } else if (shape === "sphere") {
        const r = (Math.max(comp.width, comp.height, comp.depth) / 2) * SCALE;
        geo = new THREE.SphereGeometry(r, 32, 32);
      } else {
        geo = new THREE.BoxGeometry(comp.width * SCALE, comp.height * SCALE, comp.depth * SCALE);
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(comp.x * SCALE, comp.y * SCALE, comp.z * SCALE);
      mesh.castShadow = true;
      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: "#ffffff", opacity: 0.15, transparent: true })
      );
      mesh.add(line);
      scene.add(mesh);
    });

    if (components.length === 0) {
      const ph = new THREE.Mesh(
        new THREE.BoxGeometry(20, 20, 20),
        new THREE.MeshStandardMaterial({ color: "#333333", wireframe: true })
      );
      scene.add(ph);
    }

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [components]);

  return <div ref={mountRef} className="w-full h-full" data-testid="3d-viewer" style={{ minHeight: "300px" }} />;
}

// ─── Public export ────────────────────────────────────────────────────────────

export function ThreeViewer({ components }: { components: Component3D[] }) {
  const [webglSupported] = useState(() => hasWebGL());
  if (!webglSupported) {
    return <IsometricViewer components={components} />;
  }
  return <WebGLViewer components={components} />;
}
