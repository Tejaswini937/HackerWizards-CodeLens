const CAPABILITIES = [
  { label: 'Semantic embeddings', status: 'done' },
  { label: 'Vector retrieval', status: 'done' },
  { label: 'Hybrid retrieval', status: 'done' },
  { label: 'Agentic refinement', status: 'done' },
  { label: 'Multi-pass retrieval', status: 'done' },
  { label: 'Candidate fusion & reranking', status: 'done' },
  { label: 'AST-aware indexing', status: 'planned' },
  { label: 'Version-aware retrieval', status: 'planned' },
]

const IMPLEMENTATION_STATUS = [
  { label: 'Semantic retrieval', status: 'done' },
  { label: 'Hybrid retrieval', status: 'done' },
  { label: 'FastAPI backend', status: 'done' },
  { label: 'Code ranking', status: 'done' },
  { label: 'Code snippets', status: 'done' },
  { label: 'Query analysis', status: 'done' },
  { label: 'Multi-pass agentic retrieval', status: 'done' },
  { label: 'Query refinement', status: 'done' },
  { label: 'Candidate merging & reranking', status: 'done' },
  { label: 'AST structural search', status: 'planned' },
  { label: 'Version-aware retrieval', status: 'planned' },
]

function StatusRow({ label, status }) {
  const done = status === 'done'

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <span className="text-[0.92rem] text-ink/80">
        {label}
      </span>

      <span
        className={`flex items-center gap-1.5 text-[0.8rem] font-medium ${
          done ? 'text-emerald-600' : 'text-ink/35'
        }`}
      >
        <span aria-hidden="true">
          {done ? '✓' : '○'}
        </span>

        {done ? 'Working' : 'Coming next'}
      </span>
    </li>
  )
}

export default function Technology() {
  return (
    <section
      id="technology"
      className="container-page scroll-mt-24 py-20 md:py-28"
    >
      <div className="mx-auto max-w-[640px] text-center">
        <p className="text-[0.8rem] font-semibold tracking-wide text-violet-600">
          Technology
        </p>

        <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.4rem)] font-extrabold leading-tight text-ink">
          What's actually running today.
        </h2>

        <p className="mx-auto mt-4 max-w-[52ch] text-[0.95rem] leading-relaxed text-muted">
          CodeLens combines semantic and hybrid retrieval with an
          agentic multi-pass retrieval loop. The status below reflects
          what is implemented in the current prototype.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-[900px] gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6 md:p-7">
          <p className="text-[0.78rem] font-medium tracking-wide text-muted">
            Capabilities
          </p>

          <ul className="mt-1 divide-y divide-line">
            {CAPABILITIES.map((c) => (
              <StatusRow key={c.label} {...c} />
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-panel p-6 md:p-7">
          <p className="text-[0.78rem] font-medium tracking-wide text-white/50">
            Implementation status
          </p>

          <ul className="mt-1 divide-y divide-lineDark">
            {IMPLEMENTATION_STATUS.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="text-[0.9rem] text-white/85">
                  {item.label}
                </span>

                <span
                  className={`flex items-center gap-1.5 text-[0.78rem] font-medium ${
                    item.status === 'done'
                      ? 'text-emerald-400'
                      : 'text-white/35'
                  }`}
                >
                  <span aria-hidden="true">
                    {item.status === 'done' ? '✓' : '○'}
                  </span>

                  {item.status === 'done'
                    ? 'Working'
                    : 'Coming next'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}