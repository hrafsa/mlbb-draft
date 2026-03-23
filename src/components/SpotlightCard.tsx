"use client";

import { motion } from "framer-motion";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/src/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className }: SpotlightCardProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const spotlightStyle = useMemo(
    () =>
      ({
        background: `radial-gradient(320px circle at ${position.x}px ${position.y}px, rgba(94,106,210,0.15), transparent 70%)`,
      }) satisfies CSSProperties,
    [position.x, position.y],
  );

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onMouseMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        setPosition({ x: event.clientX - box.left, y: event.clientY - box.top });
      }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_20px_rgba(0,0,0,0.4),0_0_40px_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-300" style={spotlightStyle} />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
