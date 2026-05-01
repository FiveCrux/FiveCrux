"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ParticleCanvasProps {
  className?: string;
}

/**
 * Three.js particle field — floating hexagonal nodes connected by thin orange
 * lines, evoking a "server network / script ecosystem" feel. Pure black bg.
 */
export default function ParticleCanvas({ className = "" }: ParticleCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000
    );
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Particles ──────────────────────────────────────────────────────────
    const PARTICLE_COUNT = 180;
    const spread = 900;

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities: THREE.Vector3[] = [];
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400;

      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.18,
          (Math.random() - 0.5) * 0.18,
          (Math.random() - 0.5) * 0.06
        )
      );

      sizes[i] = Math.random() * 3 + 1.5;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Glow texture — radial gradient painted to canvas
    const makeSprite = (): THREE.Texture => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const ctx = c.getContext("2d")!;
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(249,115,22,1)");
      grad.addColorStop(0.4, "rgba(234,179,8,0.6)");
      grad.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    };

    const particleMat = new THREE.PointsMaterial({
      map: makeSprite(),
      size: 5,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
      color: new THREE.Color(0xf97316),
      opacity: 0.75,
    });

    const points = new THREE.Points(particleGeo, particleMat);
    scene.add(points);

    // ── Connection Lines ───────────────────────────────────────────────────
    const MAX_DIST = 160;
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // We rebuild lines each frame only for nearby pairs (lazy graph)
    const lineGroup = new THREE.Group();
    scene.add(lineGroup);

    // ── Mouse parallax ─────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ── Resize ─────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Animation loop ─────────────────────────────────────────────────────
    let frameId: number;
    let t = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      t += 0.005;

      const pos = particleGeo.attributes.position.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;

        // Wrap around bounds
        if (pos[i * 3] > spread / 2) pos[i * 3] = -spread / 2;
        if (pos[i * 3] < -spread / 2) pos[i * 3] = spread / 2;
        if (pos[i * 3 + 1] > spread / 2) pos[i * 3 + 1] = -spread / 2;
        if (pos[i * 3 + 1] < -spread / 2) pos[i * 3 + 1] = spread / 2;
        if (pos[i * 3 + 2] > 200) pos[i * 3 + 2] = -200;
        if (pos[i * 3 + 2] < -200) pos[i * 3 + 2] = 200;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Rebuild connection lines (capped to 300 pairs for perf)
      lineGroup.clear();
      let lineCount = 0;
      outer: for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          if (lineCount >= 300) break outer;
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.18;
            const mat = lineMat.clone();
            mat.opacity = alpha;
            const geo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]),
              new THREE.Vector3(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]),
            ]);
            lineGroup.add(new THREE.Line(geo, mat));
            lineCount++;
          }
        }
      }

      // Subtle camera drift from mouse
      camera.position.x += (mouse.x * 30 - camera.position.x) * 0.02;
      camera.position.y += (mouse.y * 20 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
