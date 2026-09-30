export default function CompareDrawer({ results, onClose }) {
  if (results.length !== 2) return null

  return (
    <div className="mt-6 rounded-2xl border border-lineDark bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <p className="text-[0.78rem] font-medium tracking-wide text-white/50">
          Comparing 2 results
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 px-3 py-1 text-[0.74rem] text-white/70 transition-colors hover:border-white/30"
        >
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {results.map((r) => (
          <div key={`${r.file}-${r.function}`} className="rounded-xl bg-black/20 p-4">
            <p className="text-[0.92rem] font-medium text-white">{r.function}()</p>
            <dl className="mt-2 space-y-1 text-[0.8rem] text-white/50">
              <div className="flex justify-between gap-3">
                <dt>File</dt>
                <dd className="text-white/75">{r.file}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Lines</dt>
                <dd className="text-white/75">{r.start_line}–{r.end_line}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Score</dt>
                <dd className="text-violet-300">{Math.round(r.score * 100)}%</dd>
              </div>
            </dl>
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-black/30 p-3 text-[0.76rem] leading-relaxed text-white/80">
              <code>{r.code}</code>
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
