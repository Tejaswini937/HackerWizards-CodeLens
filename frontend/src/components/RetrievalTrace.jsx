const STANDARD_STAGES = [
  { id: 'understand', label: 'Understand query' },
  { id: 'search', label: 'Search codebase' },
  { id: 'rank', label: 'Rank candidates' },
  { id: 'return', label: 'Return relevant code' },
]

const AGENTIC_STAGES = [
  { id: 'understand', label: 'Understand query' },
  { id: 'search1', label: 'First retrieval' },
  { id: 'inspect', label: 'Inspect results' },
  { id: 'refine', label: 'Refine query' },
  { id: 'search2', label: 'Second retrieval' },
  { id: 'merge', label: 'Merge & rerank' },
  { id: 'return', label: 'Return relevant code' },
]

/**
 * status: 'idle' | 'loading' | 'success' | 'error'
 * strategy: 'semantic' | 'hybrid' | 'agentic'
 */
export default function RetrievalTrace({
  status,
  strategy = 'semantic',
}) {
  const stages =
    strategy === 'agentic'
      ? AGENTIC_STAGES
      : STANDARD_STAGES

  const isActive =
    status === 'success' || status === 'loading'

  const isSettled = status === 'success'

  return (
    <div>
      <p className="text-[0.78rem] font-medium tracking-wide text-white/50">
        Retrieval Trace
      </p>

      <ol className="mt-3 flex flex-wrap items-center gap-2">
        {stages.map((stage, i) => (
          <li
            key={stage.id}
            className="flex items-center gap-2"
          >
            <span
              className={[
                'rounded-full border px-3 py-1.5 text-[0.76rem] transition-colors duration-300',
                isSettled
                  ? 'border-violet-400/40 bg-violet-500/20 text-violet-200'
                  : isActive
                  ? 'animate-pulse border-white/20 bg-white/10 text-white/70'
                  : 'border-lineDark text-white/35',
              ].join(' ')}
            >
              {stage.label}
            </span>

            {i < stages.length - 1 && (
              <span
                className="text-white/20"
                aria-hidden="true"
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}