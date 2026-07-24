import { useEffect } from 'react'
import Lenis from 'lenis'
import { useScrollStore } from '@/utils/scrollStore'
import { easeProgress } from '@/utils/scrollEasing'

export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.6,
      smoothWheel: true,
      wheelMultiplier: 0.75,
    })

    useScrollStore.getState().setLenis(lenis)

    lenis.on('scroll', ({ progress, velocity }: { progress: number; velocity: number }) => {
      useScrollStore.getState().setProgress(easeProgress(progress), velocity)
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
