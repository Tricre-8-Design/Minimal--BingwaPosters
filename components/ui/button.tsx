import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm hover:scale-[1.02]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-text-inverse hover:bg-primary-hover shadow-glowOrange',
        destructive:
          'bg-destructive text-text-inverse hover:bg-destructive/90 shadow-md',
        outline:
          'border-2 border-white/20 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm shadow-soft',
        secondary:
          'bg-accent text-text-inverse hover:bg-accent-hover shadow-glowBlue',
        ghost: 'hover:bg-white/10 hover:text-white text-white/80',
        link: 'text-white underline-offset-4 hover:underline',
        success: 'bg-green-500 text-white hover:bg-green-600 shadow-md',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-14 rounded-xl px-8 text-lg',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
