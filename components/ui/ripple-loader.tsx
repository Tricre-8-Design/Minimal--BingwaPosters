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

export default function RippleLoader({ size = 120, color = "#a855f7", speed = 1.5, className = "" }: RippleLoaderProps) {
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Create 3 ripples with staggered delays */}
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="absolute inset-0"
          style={{
            border: `3px solid ${color}`,
            borderRadius: "9999px",
          }}
          initial={{
            scale: 0,
            opacity: 0.8
          }}
          animate={{
            scale: 1.5,
            opacity: 0,
          }}
          transition={{
            duration: speed,
            ease: "easeOut",
            repeat: Infinity,
            delay: index * (speed / 3),
          }}
        />
      ))}

      {/* Center dot */}
      <motion.div
        className="absolute"
        style={{
          width: size * 0.15,
          height: size * 0.15,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: color,
          borderRadius: "9999px",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: speed * 0.6,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </div>
  )
}