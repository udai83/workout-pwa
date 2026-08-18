import { useEffect } from 'react'

/** キーボード表示時も登録画面が画面内に収まるよう、可視領域を CSS 変数へ反映する */
export function useOverlayViewport(active: boolean) {
  useEffect(() => {
    if (!active) return

    const root = document.documentElement
    const sync = () => {
      const vv = window.visualViewport
      root.style.setProperty('--overlay-top', `${vv?.offsetTop ?? 0}px`)
      root.style.setProperty('--overlay-vh', `${vv?.height ?? window.innerHeight}px`)
    }

    sync()
    window.visualViewport?.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('scroll', sync)
    document.body.style.overflow = 'hidden'
    root.classList.add('overlay-open')

    return () => {
      window.visualViewport?.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('scroll', sync)
      document.body.style.overflow = ''
      root.classList.remove('overlay-open')
      root.style.removeProperty('--overlay-top')
      root.style.removeProperty('--overlay-vh')
    }
  }, [active])
}
