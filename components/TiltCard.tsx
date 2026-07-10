"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
};

/** Carte avec léger effet 3D au survol (désactivé si prefers-reduced-motion). */
export default function TiltCard({ children, className }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [6, -6]), {
    stiffness: 200,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(x, [0, 1], [-6, 6]), {
    stiffness: 200,
    damping: 24,
  });

  function onMouseMove(e: React.MouseEvent) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  }

  function onMouseLeave() {
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={
        reduceMotion
          ? undefined
          : { rotateX, rotateY, transformPerspective: 900 }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
