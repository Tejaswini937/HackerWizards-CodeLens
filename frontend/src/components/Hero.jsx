export default function Hero() {
  return (
    <section id="product" className="relative scroll-mt-24 overflow-hidden pt-16 pb-0 md:pt-20">
      {/* oversized ghost wordmark — bleeds down behind the CTA into the card below */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[10%] -z-0 -translate-x-1/2 select-none whitespace-nowrap text-[clamp(6rem,20vw,15rem)] font-display font-extrabold text-ink/[0.045]"
      >
        Intelligence
      </span>

      <div className="container-page relative text-center">
        <p className="text-[0.8rem] font-semibold tracking-wide text-violet-600">
          Agentic Code Intelligence
        </p>

        <h1 className="mx-auto mt-5 max-w-[16ch] text-[clamp(2.4rem,5.4vw,3.6rem)] font-extrabold leading-[1.15] text-ink">
          Understand any codebase
          <br />
          with intelligent retrieval.
        </h1>

        <p className="mx-auto mt-6 max-w-[44ch] text-[1rem] leading-relaxed text-muted">
          Ask questions in plain English. CodeLens retrieves relevant code,
refines the search, and shows you exactly where the answer lives.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#search"
            className="rounded-full bg-ink px-6 py-3 text-[0.9rem] font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-soft"
          >
            Explore codebase
          </a>
          <a
            href="#search"
            className="rounded-full border border-line px-6 py-3 text-[0.9rem] font-medium text-ink transition-colors hover:border-ink/30"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  )
}
