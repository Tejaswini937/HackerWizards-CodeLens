const STAT_LABELS = {
  strategy: 'Retrieval',
  passes: 'Passes',
  candidates: 'Candidates',
  latency: 'Latency',
}

/**
 * Small stat grid for the metadata a /search response actually returns.
 * Every value is passed in from live API data — nothing here is hardcoded.
 */
export default function RetrievalInsights({ strategy, passes, candidates, latencyMs }) {
  const tiles = [
    { label: STAT_LABELS.strategy, value: strategy },
    { label: STAT_LABELS.passes, value: passes },
    { label: STAT_LABELS.candidates, value: candidates },
    { label: STAT_LABELS.latency, value: `${latencyMs} ms` },
  ]

  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-lineDark bg-white/[0.03] px-3.5 py-3"
        >
          <dt className="text-[0.68rem] uppercase tracking-wide text-white/40">
            {tile.label}
          </dt>
          <dd className="mt-1 truncate text-[0.95rem] font-medium capitalize text-white">
            {tile.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
