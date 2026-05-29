"use client"

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  startTransition,
  ReactNode,
} from "react"

interface TiltCardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  /** Max tilt in degrees on each axis */
  maxX?: number
  maxY?: number
  /** Lerp easing factor (0–1, lower = more inertia) */
  ease?: number
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

/**
 * TiltCard — 3D tilt-on-hover card with smooth lerp inertia.
 * Inspired by the Framer Tilt Card Grid component.
 */
export function TiltCard({
  children,
  className = "",
  style,
  maxX = 14,
  maxY = 18,
  ease = 0.18,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [target, setTarget] = useState({ x: 0, y: 0 })
  const [isHover, setIsHover] = useState(false)
  const rafRef = useRef<number>(0)

  // Continuous animation loop — lerps current tilt toward target
  useEffect(() => {
    let running = true

    function animate() {
      setTilt((prev) => ({
        x: lerp(prev.x, target.x, ease),
        y: lerp(prev.y, target.y, ease),
      }))
      if (running) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [target.x, target.y, ease])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const px = clamp((e.clientX - rect.left) / rect.width * 2 - 1, -1, 1)
      const py = clamp((e.clientY - rect.top) / rect.height * 2 - 1, -1, 1)
      startTransition(() => setTarget({ x: py * maxX, y: px * maxY }))
    },
    [maxX, maxY]
  )

  const handleMouseLeave = useCallback(() => {
    setIsHover(false)
    startTransition(() => setTarget({ x: 0, y: 0 }))
  }, [])

  const handleMouseEnter = useCallback(() => setIsHover(true), [])

  const transform = `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform,
        willChange: "transform",
        transition: "box-shadow 0.2s cubic-bezier(.4,.2,.2,1)",
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </div>
  )
}
