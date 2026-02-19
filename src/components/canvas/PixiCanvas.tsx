'use client'

import { useEffect, useRef } from 'react'
import { Application, Graphics } from 'pixi.js'

interface PixiCanvasProps {
  width?: number
  height?: number
  backgroundColor?: number | string
}

export function PixiCanvas({ width = 800, height = 600, backgroundColor = 0x1099bb }: PixiCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let mounted = true

    // Initialize PIXI Application
    const initPixi = async () => {
        const app = new Application()
        await app.init({
            width,
            height,
            backgroundColor,
            resizeTo: containerRef.current || undefined,
            antialias: true,
            autoDensity: true,
            resolution: window.devicePixelRatio || 1,
        })

        if (!mounted) {
            app.destroy()
            return
        }

        if (containerRef.current) {
            // Clear any existing children (though ref ensures we are mounting once usually)
            containerRef.current.innerHTML = ''
            containerRef.current.appendChild(app.canvas)
        }

        appRef.current = app

        // Add a demo graphic for verification
        const graphics = new Graphics();
        graphics.circle(0, 0, 50);
        graphics.fill(0x4a94ff); // Neptino Primary
        graphics.x = app.screen.width / 2;
        graphics.y = app.screen.height / 2;
        app.stage.addChild(graphics);

        // Simple animation
        app.ticker.add(() => {
            graphics.rotation += 0.01;
            // graphics.x += Math.sin(app.ticker.lastTime / 1000) * 1;
        });
    }

    initPixi()

    return () => {
      mounted = false
      if (appRef.current) {
        appRef.current.destroy({ removeView: true })
        appRef.current = null
      }
    }
  }, [width, height, backgroundColor])

  return <div ref={containerRef} className="h-full w-full overflow-hidden rounded-lg border bg-slate-50 shadow-inner" />
}
