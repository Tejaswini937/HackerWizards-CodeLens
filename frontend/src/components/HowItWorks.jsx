const STAGES = [
  'Query',
  'Understand',
  'Retrieve',
  'Rank',
  'Inspect',
  'Refine',
  'Relevant Code',
]

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="container-page scroll-mt-24 py-20 md:py-28"
    >
      <div className="mx-auto max-w-[640px] text-center">
        <p className="text-[0.8rem] font-semibold tracking-wide text-violet-600">
          How it works
        </p>

        <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.4rem)] font-extrabold leading-tight text-ink">
          From plain English to the exact code.
        </h2>
      </div>

      <ol className="mx-auto mt-12 flex max-w-[1000px] flex-wrap items-center justify-center gap-x-3 gap-y-4">
        {STAGES.map((stage, i) => (
          <li key={stage} className="flex items-center gap-3">
            <span className="rounded-full border border-line bg-white px-5 py-2.5 text-[0.9rem] font-medium text-ink shadow-sm">
              {stage}
            </span>

            {i < STAGES.length - 1 && (
              <span className="text-ink/25" aria-hidden="true">
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      <p className="mx-auto mt-8 max-w-[56ch] text-center text-[0.92rem] leading-relaxed text-muted">
        CodeLens analyzes the query, retrieves relevant code using semantic
        and hybrid search, inspects the first set of candidates, refines the
        query, performs a second retrieval pass, and merges the results to
        return the most relevant code snippets.
      </p>
    </section>
  )
}