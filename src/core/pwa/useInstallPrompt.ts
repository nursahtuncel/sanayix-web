import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

type InstallState = 'unsupported' | 'already-installed' | 'promptable' | 'ios-manual'

export function useInstallPrompt() {
  const [installState, setInstallState] = useState<InstallState>('unsupported')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('pwa-install-dismissed') === 'true'
  )

  useEffect(() => {
    // Already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstallState('already-installed')
      return
    }

    // iOS Safari — no beforeinstallprompt, show manual instructions
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isInStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
    if (isIos && !isInStandalone) {
      setInstallState('ios-manual')
      return
    }

    // Chrome/Edge/Samsung — native prompt available
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setInstallState('promptable')
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const prompt = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable'
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') {
      setInstallState('already-installed')
    }
    return outcome
  }

  const dismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    setDismissed(true)
  }

  const shouldShowBanner =
    (installState === 'promptable' || installState === 'ios-manual') && !dismissed

  return { installState, shouldShowBanner, prompt, dismiss }
}
