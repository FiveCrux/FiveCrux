"use client"

import { useEffect, useRef } from "react"

interface LiquidBackgroundProps {
  className?: string
  /** Opacity of the whole canvas overlay (0–1) */
  opacity?: number
}

/**
 * Animated liquid / organic blob background.
 * Inspired by the Framer AnimatedLiquidBackground "Lava" template.
 * Draws directly on a <canvas> using requestAnimationFrame — no WebGL required.
 */
export function LiquidBackground({ className = "", opacity = 1 }: LiquidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let t = 0

    const resize = () => {
      width = canvas.width = canvas.offsetWidth
      height = canvas.height = canvas.offsetHeight
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    // Blob definitions — position oscillates with different phase/frequency
    const blobs = [
      { xPhase: 0.0, yPhase: 0.5, xFreq: 0.18, yFreq: 0.13, size: 0.55, color: "rgba(249,115,22,0.55)" },
      { xPhase: 2.1, yPhase: 1.3, xFreq: 0.12, yFreq: 0.20, size: 0.48, color: "rgba(234,88,12,0.45)" },
      { xPhase: 4.2, yPhase: 0.9, xFreq: 0.22, yFreq: 0.15, size: 0.40, color: "rgba(251,191,36,0.30)" },
      { xPhase: 1.0, yPhase: 3.5, xFreq: 0.16, yFreq: 0.11, size: 0.38, color: "rgba(249,115,22,0.35)" },
      { xPhase: 5.0, yPhase: 2.0, xFreq: 0.10, yFreq: 0.18, size: 0.50, color: "rgba(180,60,10,0.40)" },
    ]

    const draw = () => {
      t += 0.004

      // Dark background fill
      ctx.clearRect(0, 0, width, height)

      // Draw each blob as a radial gradient
      for (const b of blobs) {
        const cx = width * (0.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * b.xFreq * 60 + b.xPhase)))
        const cy = height * (0.15 + 0.7 * (0.5 + 0.5 * Math.cos(t * b.yFreq * 60 + b.yPhase)))
        const r = Math.min(width, height) * b.size

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        grad.addColorStop(0, b.color)
        grad.addColorStop(1, "rgba(0,0,0,0)")

        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, height)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ opacity, filter: "blur(60px)", mixBlendMode: "screen" }}
    />
  )
}
