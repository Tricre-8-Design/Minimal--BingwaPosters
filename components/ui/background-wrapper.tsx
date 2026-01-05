import React from 'react'
import { Sparkles, Star, Square, Tag, Layout } from 'lucide-react'

// Pre-defined decorative elements for the subtle background drift
const FLOATING_ICONS = [
  { Icon: Sparkles, left: '10%', delay: '0s', duration: '18s', size: 24 },
  { Icon: Layout, left: '25%', delay: '4s', duration: '22s', size: 20 },
  { Icon: Star, left: '40%', delay: '8s', duration: '25s', size: 28 },
  { Icon: Square, left: '60%', delay: '2s', duration: '20s', size: 18 },
  { Icon: Tag, left: '75%', delay: '6s', duration: '24s', size: 22 },
  { Icon: Sparkles, left: '85%', delay: '10s', duration: '21s', size: 16 },
  { Icon: Layout, left: '15%', delay: '12s', duration: '23s', size: 26 },
  { Icon: Square, left: '50%', delay: '14s', duration: '26s', size: 20 },
  { Icon: Star, left: '90%', delay: '5s', duration: '19s', size: 22 },
  { Icon: Tag, left: '30%', delay: '15s', duration: '28s', size: 18 },
]

interface BackgroundWrapperProps {
  children: React.ReactNode
  className?: string
}

export function BackgroundWrapper({ children, className = "" }: BackgroundWrapperProps) {
  return (
    <div className={`min-h-screen relative overflow-hidden bg-gradient-to-br from-gradient-from to-gradient-to bg-cover ${className}`}>
      
      {/* Decorative Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {FLOATING_ICONS.map((item, i) => {
          const { Icon, left, delay, duration, size } = item
          return (
            <div
              key={i}
              className="absolute animate-drift opacity-10 text-white blur-[1px]"
              style={{
                left,
                top: '-10%', // Start above viewport
                animationDuration: duration,
                animationDelay: delay,
              }}
            >
              <Icon size={size} />
            </div>
          )
        })}
      </div>

      {/* Content Layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
