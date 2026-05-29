"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useMotionTemplate,
  animate,
  useReducedMotion,
} from "framer-motion";

interface InteractiveGradientProps {
  color1?: string;
  color2?: string;
  color3?: string;
  loopDuration?: number;
  orbitRadius?: number;
  followStrength?: number;
  blur?: number;
  brightness?: number;
  radius?: number | string;
  className?: string;
}

export function InteractiveGradient({
  color1 = "#ff7a00",
  color2 = "#ff0055",
  color3 = "#7a00ff",
  loopDuration = 10,
  orbitRadius = 25,
  followStrength = 0.45,
  blur = 60,
  brightness = 1.0,
  radius = "0px",
  className,
}: InteractiveGradientProps) {
  const reduce = useReducedMotion();

  // Pointer position normalized to 0-100% inside container
  const pointerX = useMotionValue(50);
  const pointerY = useMotionValue(50);

  // Springs for smooth movement
  const pX = useSpring(pointerX, { stiffness: 140, damping: 24, mass: 0.5 });
  const pY = useSpring(pointerY, { stiffness: 140, damping: 24, mass: 0.5 });

  // Map pointer to followStrength bounds
  const x1 = useTransform(pX, (v) => 50 + (v - 50) * followStrength);
  const y1 = useTransform(pY, (v) => 50 + (v - 50) * followStrength);

  // Orbital lobe phases
  const phase = useMotionValue(0);

  React.useEffect(() => {
    if (reduce) return;
    const controls = animate(phase, Math.PI * 2, {
      duration: Math.max(0.1, loopDuration),
      ease: "linear",
      repeat: Infinity,
    });
    return () => controls.stop();
  }, [loopDuration, reduce, phase]);

  // Orbit trajectories (120 degrees apart)
  const x2 = useTransform(phase, (t) => 50 + Math.cos(t) * orbitRadius);
  const y2 = useTransform(phase, (t) => 50 + Math.sin(t) * orbitRadius);
  const x3 = useTransform(phase, (t) => 50 + Math.cos(t + (2 * Math.PI) / 3) * orbitRadius);
  const y3 = useTransform(phase, (t) => 50 + Math.sin(t + (2 * Math.PI) / 3) * orbitRadius);

  // Build the gradient background style
  const background = useMotionTemplate`
    radial-gradient(circle at ${x1}% ${y1}%, ${color1} 0%, rgba(249, 115, 22, 0.15) 30%, rgba(0,0,0,0) 65%),
    radial-gradient(circle at ${x2}% ${y2}%, ${color2} 0%, rgba(220, 38, 38, 0.12) 30%, rgba(0,0,0,0) 65%),
    radial-gradient(circle at ${x3}% ${y3}%, ${color3} 0%, rgba(124, 58, 237, 0.12) 30%, rgba(0,0,0,0) 65%)
  `;

  const containerRef = React.useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    pointerX.set(Math.max(0, Math.min(100, x)));
    pointerY.set(Math.max(0, Math.min(100, y)));
  };

  const handlePointerLeave = () => {
    animate(pointerX, 50, { duration: 0.6, ease: "easeOut" });
    animate(pointerY, 50, { duration: 0.6, ease: "easeOut" });
  };

  return (
    <motion.div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: radius,
        filter: `blur(${blur}px) brightness(${brightness})`,
        background,
        willChange: "background",
        overflow: "hidden",
      }}
    />
  );
}
