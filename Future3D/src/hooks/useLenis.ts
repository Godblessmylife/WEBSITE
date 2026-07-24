import { useEffect } from 'react'
import Lenis from 'lenis'
import { useScrollStore } from '@/utils/scrollStore'

// Smootherstep (Perlin): нулевая первая И вторая производная на обоих
// концах — прогресс путешествия почти не меняется у самого начала и
// самого конца скролла, давая "паузу", чтобы разглядеть открывающую
// сцену (космос/Земля) и финал (город), вместо резкого влёта/вылета.
function smootherstep(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
    })

    useScrollStore.getState().setLenis(lenis)

    lenis.on('scroll', ({ progress, velocity }: { progress: number; velocity: number }) => {
      useScrollStore.getState().setProgress(smootherstep(progress), velocity)
    })

    let frameId = requestAnimationFrame(raf)
    function raf(time: number) {
      lenis.raf(time)
      frameId = requestAnimationFrame(raf)
    }

    return () => {
      cancelAnimationFrame(frameId)
      lenis.destroy()
    }
  }, [])
}
