import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { searchCode } from '../services/api.js'
import useSearchHistory from '../hooks/useSearchHistory.js'

import RetrievalInsights from './RetrievalInsights.jsx'
import RetrievalTrace from './RetrievalTrace.jsx'
import ResultCard from './ResultCard.jsx'
import CompareDrawer from './CompareDrawer.jsx'
import CodebaseExplorer from './CodebaseExplorer.jsx'


const DEFAULT_QUERY =
  'How is the input preprocessed before the main function?'

const EXAMPLE_QUERIES = [
  'How is the input preprocessed before the main function?',
  'Where is input validation performed?',
  'Which function loads records in batches?',
  'Where are model predictions calculated?',
]

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'python', label: 'Python' },
  { id: 'functions', label: 'Functions' },
  { id: 'high', label: 'High relevance' },
]

const THRESHOLD_OPTIONS = [
  { value: 0, label: 'All' },
  { value: 0.1, label: '> 10%' },
  { value: 0.2, label: '> 20%' },
  { value: 0.3, label: '> 30%' },
]

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'rank', label: 'Rank' },
  { id: 'file', label: 'File' },
  { id: 'function', label: 'Function' },
]

// Values are sent to the backend as-is in `strategy`.
const STRATEGY_OPTIONS = [
  { id: 'semantic', label: 'Semantic' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'agentic', label: 'Agentic' },
]

const resultKey = (r) =>
  `${r.file}-${r.function}-${r.start_line}`


export default function SearchDemo() {
  const [query, setQuery] = useState(DEFAULT_QUERY)

  const [status, setStatus] = useState('idle')

  const [results, setResults] = useState([])

  const [meta, setMeta] = useState(null)

  const [errorMessage, setErrorMessage] = useState('')

  const [expandedKey, setExpandedKey] = useState(null)

  const [filter, setFilter] = useState('all')

  const [threshold, setThreshold] = useState(0)

  const [sortBy, setSortBy] = useState('relevance')

  const [selected, setSelected] = useState([])

  const [compareOpen, setCompareOpen] = useState(false)

  // REAL retrieval strategy: 'semantic' | 'hybrid' | 'agentic'
  const [strategy, setStrategy] = useState('semantic')

  const inputRef = useRef(null)

  // Only the most recent request may update the UI.
  const requestIdRef = useRef(0)

  const {
    history,
    addToHistory,
    clearHistory,
  } = useSearchHistory()


  const runSearch = useCallback(
    async (
      q,
      {
        addHistory = true,
        searchStrategy = strategy,
      } = {}
    ) => {
      if (!q.trim()) return

      const requestId = ++requestIdRef.current

      setStatus('loading')
      setErrorMessage('')
      setExpandedKey(null)
      setSelected([])
      setCompareOpen(false)

      try {
        const data = await searchCode(
          q,
          10,
          searchStrategy
        )

        // A newer request has started; ignore this response.
        if (requestId !== requestIdRef.current) return

        setResults(
          Array.isArray(data.results)
            ? data.results
            : []
        )

        setMeta({
          strategy: data.strategy,
          agent_iterations:
            data.agent_iterations,
          latency_ms: data.latency_ms,
        })

        setStatus('success')

        if (addHistory) {
          addToHistory(q)
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return

        console.error(err)

        setErrorMessage(
          err?.message ||
            'Something went wrong.'
        )

        setStatus('error')
      }
    },
    [addToHistory, strategy]
  )


  // Initial real search
  useEffect(() => {
    runSearch(DEFAULT_QUERY, {
      addHistory: false,
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // Ctrl + K
  useEffect(() => {
    function onKeyDown(e) {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'k'
      ) {
        e.preventDefault()

        inputRef.current?.focus()
      }
    }

    window.addEventListener(
      'keydown',
      onKeyDown
    )

    return () =>
      window.removeEventListener(
        'keydown',
        onKeyDown
      )
  }, [])


  function handleClear() {
    // Invalidate any in-flight request so it can't repopulate the UI.
    requestIdRef.current += 1

    setQuery('')
    setResults([])
    setStatus('idle')
    setMeta(null)
    setErrorMessage('')
    setExpandedKey(null)
    setSelected([])
    setCompareOpen(false)

    inputRef.current?.focus()
  }


  function handleToggleSelect(result) {
    setSelected((prev) => {
      const exists = prev.some(
        (r) =>
          resultKey(r) === resultKey(result)
      )

      if (exists) {
        return prev.filter(
          (r) =>
            resultKey(r) !== resultKey(result)
        )
      }

      if (prev.length >= 2) {
        return prev
      }

      return [...prev, result]
    })
  }


  function handleStrategyChange(nextStrategy) {
    setStrategy(nextStrategy)

    // Immediately run the same query using
    // the newly selected retrieval strategy.
    if (query.trim()) {
      runSearch(query, {
        addHistory: false,
        searchStrategy: nextStrategy,
      })
    }
  }


  const visibleResults = useMemo(() => {
    let list = results

    if (filter === 'python') {
      list = list.filter((r) =>
        r.file.endsWith('.py')
      )
    }

    if (filter === 'high') {
      list = list.filter(
        (r) => r.score >= 0.7
      )
    }

    // Every current backend chunk is a function.
    if (filter === 'functions') {
      list = list.filter(
        (r) => Boolean(r.function)
      )
    }

    list = list.filter(
      (r) => r.score >= threshold
    )

    const sorted = [...list]

    if (sortBy === 'rank') {
      sorted.sort(
        (a, b) => a.rank - b.rank
      )
    } else if (sortBy === 'file') {
      sorted.sort((a, b) =>
        a.file.localeCompare(b.file)
      )
    } else if (sortBy === 'function') {
      sorted.sort((a, b) =>
        a.function.localeCompare(
          b.function
        )
      )
    } else {
      sorted.sort(
        (a, b) => b.score - a.score
      )
    }

    return sorted
  }, [
    results,
    filter,
    threshold,
    sortBy,
  ])


  const badge =
    status === 'loading'
      ? {
          dot: 'bg-amber-300',
          text: 'Searching…',
        }
      : status === 'error'
      ? {
          dot: 'bg-rose-400',
          text: 'Backend unavailable',
        }
      : status === 'success'
      ? {
          dot: 'bg-emerald-300',
          text: `Live · ${meta?.latency_ms ?? 0}ms`,
        }
      : {
          dot: 'bg-white/40',
          text: 'Ready',
        }


  return (
    <section
      id="search"
      className="container-page relative scroll-mt-24 pt-10 pb-20 md:pb-28"
    >
      <div className="relative">

        {/* =========================
            SEARCH HERO
        ========================== */}

        <div className="relative rounded-xl3 bg-gradient-to-br from-violet-600 via-violet-700 to-[#3B1173] px-6 py-12 shadow-panel md:px-14 md:py-16">

          {/* Status */}
          <div className="absolute right-6 top-6 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[0.78rem] text-white/85 backdrop-blur-sm md:right-10 md:top-10">

            <span className="relative flex h-1.5 w-1.5">

              {status !== 'error' && (
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${badge.dot}`}
                />
              )}

              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${badge.dot}`}
              />

            </span>

            {badge.text}

          </div>


          <div className="mx-auto max-w-[680px] text-center">

            <p className="text-[0.85rem] font-medium text-white/70">
              Search your codebase
            </p>


            {/* SEARCH INPUT */}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">

              <label
                htmlFor="codebase-query"
                className="sr-only"
              >
                Codebase search query
              </label>


              <div className="relative flex-1">

                <input
                  id="codebase-query"
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) =>
                    setQuery(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      runSearch(query)
                    }
                  }}
                  placeholder="Ask a question about your codebase…"
                  className="w-full rounded-full border border-white/15 bg-white/95 py-3.5 pl-5 pr-16 text-left text-[0.92rem] text-ink placeholder:text-muted focus:outline-none"
                />

                <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-line bg-white px-1.5 py-0.5 text-[0.7rem] text-muted">
                  Ctrl K
                </kbd>

              </div>


              <div className="flex gap-2">

                {(query || results.length > 0) && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="shrink-0 rounded-full border border-white/20 px-5 py-3.5 text-[0.88rem] text-white/80 transition-colors hover:border-white/40"
                  >
                    Clear
                  </button>
                )}


                <button
                  type="button"
                  onClick={() => runSearch(query)}
                  disabled={
                    status === 'loading'
                  }
                  className="shrink-0 rounded-full bg-ink px-7 py-3.5 text-[0.92rem] font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {status === 'loading'
                    ? 'Searching…'
                    : 'Search'}
                </button>

              </div>

            </div>


            {/* EXAMPLES */}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">

              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuery(q)

                    runSearch(q)
                  }}
                  className="rounded-full bg-white/10 px-3.5 py-1.5 text-[0.76rem] text-white/75 transition-colors hover:bg-white/15 hover:text-white"
                >
                  {q}
                </button>
              ))}

            </div>


            {/* RECENT SEARCHES */}

            {history.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[0.76rem] text-white/50">

                <span>
                  Recent:
                </span>

                {history.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setQuery(q)
                      runSearch(q)
                    }}
                    className="rounded-full border border-white/15 px-3 py-1 text-white/70 transition-colors hover:border-white/30 hover:text-white"
                  >
                    {q.length > 40
                      ? `${q.slice(
                          0,
                          40
                        )}…`
                      : q}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-white/40 underline decoration-white/20 underline-offset-2 hover:text-white/70"
                >
                  Clear history
                </button>

              </div>
            )}


            {/* RETRIEVAL MODE */}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[0.76rem] text-white/50">

              <div className="flex items-center gap-1.5 rounded-full bg-white/5 p-1">

                {STRATEGY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      handleStrategyChange(
                        opt.id
                      )
                    }
                    aria-pressed={
                      strategy === opt.id
                    }
                    className={`rounded-full px-3 py-1 font-medium transition-colors ${
                      strategy === opt.id
                        ? 'bg-white text-ink'
                        : 'text-white/45 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}

              </div>


              {/* VERSION */}

              <span
                tabIndex={0}
                className="group relative"
              >
                Sample Repository · v1

                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2.5 py-1 text-[0.72rem] text-white/90 group-hover:block group-focus-within:block">
                  Version-aware retrieval coming soon
                </span>

              </span>

            </div>

          </div>
        </div>


        {/* =========================
            RESULTS PANEL
            (normal document flow; no negative margin)
        ========================== */}

        <div className="relative mx-4 mt-6 rounded-2xl bg-panel p-6 shadow-panel md:mx-14 md:mt-8 md:p-8">

          {status === 'success' &&
          meta ? (
            <RetrievalInsights
              strategy={meta.strategy}
              passes={meta.agent_iterations}
              candidates={results.length}
              latencyMs={meta.latency_ms}
            />
          ) : (
            <p className="text-[0.78rem] font-medium tracking-wide text-white/50">
              {status === 'loading'
                ? 'Running retrieval…'
                : status === 'error'
                ? 'Code Intelligence'
                : 'Idle'}
            </p>
          )}


          <div className="mt-5">
           <RetrievalTrace
  status={status}
  strategy={meta?.strategy || strategy}
/>
          </div>


          {/* ERROR */}

          {status === 'error' && (
            <div className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/5 p-5 text-center">

              <p className="text-[0.9rem] text-rose-200">
                CodeLens engine is unavailable.
              </p>

              <p className="mt-1 text-[0.8rem] text-white/40">
                {errorMessage}
              </p>


              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">

                <button
                  type="button"
                  onClick={() =>
                    runSearch(query, {
                      addHistory: false,
                    })
                  }
                  className="rounded-full border border-white/15 px-5 py-2 text-[0.82rem] text-white/80 transition-colors hover:border-white/30"
                >
                  Retry
                </button>


                <a
                  href="http://localhost:8000/health"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/15 px-5 py-2 text-[0.82rem] text-white/80 transition-colors hover:border-white/30"
                >
                  Check connection
                </a>

              </div>

            </div>
          )}


          {/* LOADING */}

          {status === 'loading' && (
            <ul className="mt-5 divide-y divide-lineDark">

              {[0, 1, 2].map((i) => (
                <li
                  key={i}
                  className="flex items-center gap-4 py-3.5"
                >

                  <div className="h-4 w-6 animate-pulse rounded bg-white/10" />

                  <div className="flex-1 space-y-2">

                    <div className="h-3.5 w-40 animate-pulse rounded bg-white/10" />

                    <div className="h-3 w-56 animate-pulse rounded bg-white/5" />

                  </div>

                </li>
              ))}

            </ul>
          )}


          {/* SUCCESS */}

          {status === 'success' && (
            <>
              {results.length === 0 ? (
                <p className="mt-6 py-6 text-center text-[0.88rem] text-white/40">
                  No matching functions found
                  for that query.
                </p>
              ) : (
                <>

                  {/* FILTERS */}

                  <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-lineDark pt-5 text-[0.78rem]">

                    <div className="flex flex-wrap items-center gap-1.5">

                      <span className="mr-1 text-white/40">
                        Filter
                      </span>

                      {FILTER_OPTIONS.map(
                        (opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              setFilter(
                                opt.id
                              )
                            }
                            aria-pressed={
                              filter ===
                              opt.id
                            }
                            className={`rounded-full px-3 py-1 transition-colors ${
                              filter ===
                              opt.id
                                ? 'bg-violet-500/25 text-violet-200'
                                : 'text-white/55 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      )}

                    </div>


                    {/* THRESHOLD */}

                    <div className="flex flex-wrap items-center gap-1.5">

                      <span className="mr-1 text-white/40">
                        Relevance
                      </span>

                      {THRESHOLD_OPTIONS.map(
                        (opt) => (
                          <button
                            key={
                              opt.value
                            }
                            type="button"
                            onClick={() =>
                              setThreshold(
                                opt.value
                              )
                            }
                            aria-pressed={
                              threshold ===
                              opt.value
                            }
                            className={`rounded-full px-3 py-1 transition-colors ${
                              threshold ===
                              opt.value
                                ? 'bg-violet-500/25 text-violet-200'
                                : 'text-white/55 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      )}

                    </div>


                    {/* SORT */}

                    <label className="ml-auto flex items-center gap-2 text-white/50">

                      Sort

                      <select
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(
                            e.target.value
                          )
                        }
                        className="rounded-md border border-lineDark bg-panel2 px-2 py-1 text-white/80 focus:outline-none"
                      >

                        {SORT_OPTIONS.map(
                          (opt) => (
                            <option
                              key={opt.id}
                              value={opt.id}
                            >
                              {opt.label}
                            </option>
                          )
                        )}

                      </select>

                    </label>

                  </div>


                  {/* COMPARE */}

                  <div className="mt-4 flex items-center justify-between text-[0.78rem] text-white/50">

                    <span>
                      {selected.length}{' '}
                      selected
                    </span>

                    <button
                      type="button"
                      disabled={
                        selected.length !==
                        2
                      }
                      onClick={() =>
                        setCompareOpen(true)
                      }
                      className="rounded-full border border-white/15 px-4 py-1.5 text-white/80 transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15"
                    >
                      Compare
                    </button>

                  </div>


                  {/* RESULT LIST */}

                  {visibleResults.length ===
                  0 ? (
                    <p className="mt-4 py-6 text-center text-[0.85rem] text-white/40">
                      No results match the
                      current filters.
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-lineDark">

                      {visibleResults.map(
                        (r) => {
                          const key =
                            resultKey(r)

                          return (
                            <ResultCard
                              key={key}
                              result={r}
                              isExpanded={
                                expandedKey ===
                                key
                              }
                              onToggleExpand={() =>
                                setExpandedKey(
                                  expandedKey ===
                                    key
                                    ? null
                                    : key
                                )
                              }
                              isSelected={selected.some(
                                (s) =>
                                  resultKey(
                                    s
                                  ) === key
                              )}
                              selectionDisabled={
                                selected.length >=
                                  2 &&
                                !selected.some(
                                  (s) =>
                                    resultKey(
                                      s
                                    ) === key
                                )
                              }
                              onToggleSelect={
                                handleToggleSelect
                              }
                            />
                          )
                        }
                      )}

                    </ul>
                  )}


                  {/* COMPARE DRAWER */}

                  {compareOpen && (
                    <CompareDrawer
                      results={selected}
                      onClose={() =>
                        setCompareOpen(false)
                      }
                    />
                  )}

                </>
              )}
            </>
          )}

        </div>


        {/* CODEBASE EXPLORER */}

        <div className="mx-4 mt-6 md:mx-14">
          <CodebaseExplorer
            results={results}
          />
        </div>

      </div>
    </section>
  )
}