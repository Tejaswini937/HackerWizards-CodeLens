import { useApiHealth } from '../hooks/useApiHealth.js'

const STATE_STYLES = {
  checking: { dot: 'bg-white/40', label: 'Checking engine…' },
  online: { dot: 'bg-emerald-400', label: 'CodeLens engine online' },
  offline: { dot: 'bg-rose-400', label: 'CodeLens engine offline' },
}

export default function ApiStatusBadge({ className = '' }) {
  const status = useApiHealth()
  const { dot, label } = STATE_STYLES[status]

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 text-[0.78rem] text-ink/60 ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {status === 'online' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dot}`} />
      </span>
      {label}
    </span>
  )
}
