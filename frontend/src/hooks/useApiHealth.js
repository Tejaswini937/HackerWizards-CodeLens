import { useEffect, useState } from 'react'
import { checkHealth } from '../services/api.js'

const POLL_INTERVAL_MS = 20000

/**
 * Polls the real GET /health endpoint. Returns 'checking' | 'online' | 'offline'.
 * Never fakes a status — 'offline' only appears when the request actually fails.
 */
export function useApiHealth() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        await checkHealth()
        if (!cancelled) setStatus('online')
      } catch {
        if (!cancelled) setStatus('offline')
      }
    }

    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return status
}
