import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#78716C] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#78716C] text-white",
        secondary: "border-transparent bg-[#F6F6F6] text-[#0F172A]",
        destructive: "border-transparent bg-red-500 text-white",
        outline: "text-[#0F172A] border-[#EEEDED]",
        accent: "border-transparent bg-[#D97706] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
