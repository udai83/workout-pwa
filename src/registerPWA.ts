import { registerSW } from 'virtual:pwa-register'

const CHECK_INTERVAL_MS = 30 * 60 * 1000

async function checkForUpdate(swUrl: string, registration: ServiceWorkerRegistration) {
  if (registration.installing) return
  if (!navigator.onLine) return

  try {
    const resp = await fetch(swUrl, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
    })
    if (resp.status === 200) {
      await registration.update()
    }
  } catch {
    // オフラインや一時的なエラーでは現行キャッシュを維持する
  }
}

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return

    const check = () => {
      void checkForUpdate(swUrl, registration)
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
    window.addEventListener('focus', check)
    window.addEventListener('online', check)
    window.setInterval(check, CHECK_INTERVAL_MS)
  },
})
