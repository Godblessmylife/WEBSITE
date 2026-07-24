import { useEffect } from 'react'
import Lenis from 'lenis'
import { useScrollStore } from '@/utils/scrollStore'

export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
    })

    useScrollStore.getState().setLenis(lenis)

    lenis.on('scroll', ({ progress, velocity }: { progress: number; velocity: number }) => {
      useScrollStore.getState().setProgress(progress, velocity)
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
