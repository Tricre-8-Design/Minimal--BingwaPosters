"use client"

import React from "react"
import { motion } from "framer-motion"

// RippleLoader: Animated concentric circles using framer-motion
// Props:
// - size: base size of the ripple container (px)
// - color: ripple color (CSS color string)
// - speed: animation duration for each ripple cycle (seconds)
// - className: extra class names for layout/styling
// Intent: Provide a smooth, accessible loader with a ripple effect

type RippleLoaderProps = {
  size?: number
  color?: string
  speed?: number
  className?: string
}

export default function RippleLoader({ size = 120, color = "#7c3aed", speed = 1.6, className = "" }: RippleLoaderProps) {
  const circleStyle: React.CSSProperties = {
    position: "absolute",
    borderRadius: "9999px",
    border: `3px solid ${color}`,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  }

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {[0, 0.33, 0.66].map((delay, idx) => (
        <motion.span
          key={idx}
          style={{ ...circleStyle, width: size * 0.3, height: size * 0.3 }}
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: speed, ease: "easeOut", repeat: Infinity, repeatDelay: 0.2, delay }}
        />
      ))}
      {/* Center dot */}
      <span
        aria-hidden
        style={{ width: size * 0.1, height: size * 0.1, background: color, ...circleStyle }}
      />
    </div>
  )
}