"use client";

import { useRef, type ReactNode } from "react";
import {
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * Carte interactive : léger tilt 3D + halo « projecteur » qui suit le
 * curseur à l'intérieur de la carte. Désactivé si prefers-reduced-motion.
 */
export default function SpotlightCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), {
    stiffness: 180,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(px, [0, 1], [-7, 7]), {
    stiffness: 180,
    damping: 22,
  });

  function onMouseMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    ref.current.style.setProperty("--mx", `${mx}px`);
    ref.current.style.setProperty("--my", `${my}px`);
    if (!reduceMotion) {
      px.set(mx / rect.width);
      py.set(my / rect.height);
    }
  }

  function onMouseLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <m.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={
        reduceMotion
          ? undefined
          : { rotateX, rotateY, transformPerspective: 900 }
      }
      className={`group relative ${className}`}
    >
      {/* Halo projecteur qui suit le curseur */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), rgba(94, 203, 51, 0.13), transparent 70%)",
        }}
      />
      {children}
    </m.div>
  );
}
