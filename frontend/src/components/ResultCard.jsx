import { useState } from 'react'

/**
 * result: { rank, score, file, function, start_line, end_line, code, reason }
 * All fields come straight from the /search API response.
 */
export default function ResultCard({
  result,
  isExpanded,
  onToggleExpand,
  isSelected,
  selectionDisabled,
  onToggleSelect,
}) {
  const [showReason, setShowReason] = useState(false)
  const [copyState, setCopyState] = useState('idle') // idle | copied | failed

  async function handleCopy(e) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(result.code)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
    setTimeout(() => setCopyState('idle'), 1500)
  }

  return (
    <li className="py-3.5">
      <div className="flex items-center gap-3">
        <label className="flex items-center pt-0.5" onClick={(e) => e.stopPropagation()}>
          <span className="sr-only">
            Select {result.function} for comparison
          </span>
          <input
            type="checkbox"
            checked={isSelected}
            disabled={selectionDisabled}
            onChange={() => onToggleSelect(result)}
            className="h-4 w-4 rounded border-white/25 bg-transparent text-violet-500 accent-violet-500 disabled:opacity-30"
          />
        </label>

        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          className="flex flex-1 items-center justify-between gap-4 rounded-lg text-left transition-colors hover:bg-white/[0.03]"
        >
          <div className="flex items-center gap-4">
            <span className="font-display text-[1rem] font-semibold text-white/30">
              {String(result.rank).padStart(2, '0')}
            </span>
            <div>
              <p className="text-[0.92rem] font-medium text-white">
                {result.function}()
              </p>
              <p className="text-[0.8rem] text-white/45">
                {result.file} · lines {result.start_line}–{result.end_line}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[0.82rem] text-violet-300">
              {Math.round(result.score * 100)}%
            </span>
            <span
              className={`text-white/30 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </div>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pl-9">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowReason((v) => !v)
              }}
              aria-expanded={showReason}
              className="text-[0.78rem] text-violet-300 underline decoration-violet-300/30 underline-offset-2 transition-colors hover:text-violet-200"
            >
              {showReason ? 'Hide reason' : 'Why this result?'}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full border border-white/15 px-3 py-1 text-[0.74rem] text-white/70 transition-colors hover:border-white/30"
            >
              {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy code'}
            </button>
          </div>

          {showReason && (
            <p className="mt-2 rounded-lg bg-white/5 p-3 text-[0.8rem] italic text-white/60">
              {result.reason}
            </p>
          )}

          <pre className="mt-3 overflow-x-auto rounded-lg bg-black/30 p-4 text-[0.8rem] leading-relaxed text-white/80">
            <code>{result.code}</code>
          </pre>
        </div>
      )}
    </li>
  )
}
