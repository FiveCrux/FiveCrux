import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface VerifiedIconProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
}

export function VerifiedIcon({ size = "md", className }: VerifiedIconProps) {
  return (
    <span title="Verified Creator" className="inline-block ml-1 -mb-1">
      <CheckCircle
        className={cn(
          "text-[#1DA1F2] flex-shrink-0",
          sizeMap[size],
          className
        )}
        aria-label="Verified Creator"
      />
    </span>
  )
}

