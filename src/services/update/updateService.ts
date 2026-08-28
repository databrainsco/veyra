import { registerSW } from 'virtual:pwa-register'

export type UpdateCheckResult = 'updated' | 'uptodate' | 'unsupported' | 'error'

let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined

export function initAppUpdates(): void {
  if (!('serviceWorker' in navigator)) return

  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Handled manually via checkForUpdates
    },
  })
}

function waitForWaitingWorker(
  registration: ServiceWorkerRegistration,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (registration.waiting) {
      resolve(true)
      return
    }

    const installing = registration.installing
    if (!installing) {
      resolve(false)
      return
    }

    const timer = window.setTimeout(() => resolve(false), timeoutMs)

    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        clearTimeout(timer)
        resolve(true)
      }
      if (installing.state === 'installed' && !navigator.serviceWorker.controller) {
        clearTimeout(timer)
        resolve(false)
      }
    })
  })
}

async function activateWaitingWorker(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  const waiting = registration.waiting
  if (!waiting) return

  if (applyUpdate) {
    await applyUpdate(true)
  } else {
    waiting.postMessage({ type: 'SKIP_WAITING' })
    window.location.reload()
  }
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  if (!('serviceWorker' in navigator)) {
    return 'unsupported'
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      return 'uptodate'
    }

    if (registration.waiting) {
      await activateWaitingWorker(registration)
      return 'updated'
    }

    await registration.update()
    const found = await waitForWaitingWorker(registration, 5000)

    if (found) {
      await activateWaitingWorker(registration)
      return 'updated'
    }

    return 'uptodate'
  } catch {
    return 'error'
  }
}

export function isUpdateSupported(): boolean {
  return 'serviceWorker' in navigator
}
