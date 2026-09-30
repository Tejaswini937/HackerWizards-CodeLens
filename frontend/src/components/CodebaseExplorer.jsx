import { useState } from 'react'

// Names of the real files in data/sample_repo — nothing invented here,
// just the filenames the backend indexes.
const SAMPLE_REPO_FILES = ['preprocess.py', 'validation.py', 'data_loader.py', 'model.py']

/**
 * The frontend has no endpoint to fetch raw file contents, so rather than
 * faking a file preview, this shows only snippets that came back from the
 * last real search and belong to the selected file — clearly labeled as
 * retrieved snippets, not a full file view.
 */
export default function CodebaseExplorer({ results }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const snippetsForFile = results.filter((r) => r.file === selectedFile)

  return (
    <div className="rounded-2xl border border-lineDark bg-panel p-5 shadow-panel">
      <p className="text-[0.78rem] font-medium tracking-wide text-white/60">
        Codebase
      </p>

      <ul className="mt-3 flex flex-wrap gap-2">
        {SAMPLE_REPO_FILES.map((file) => (
          <li key={file}>
            <button
              type="button"
              onClick={() => setSelectedFile(file === selectedFile ? null : file)}
              aria-pressed={file === selectedFile}
              className={[
                'rounded-full border px-3.5 py-1.5 text-[0.8rem] transition-colors',
                file === selectedFile
                  ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                  : 'border-lineDark text-white/70 hover:border-white/30 hover:text-white',
              ].join(' ')}
            >
              {file}
            </button>
          </li>
        ))}
      </ul>

      {selectedFile && (
        <div className="mt-4">
          <p className="text-[0.76rem] text-white/50">
            Retrieved snippets from your last search — not a full file view.
          </p>

          {snippetsForFile.length === 0 ? (
            <p className="mt-3 rounded-lg border border-lineDark bg-white/5 p-3 text-[0.82rem] text-white/60">
              No retrieved snippets from {selectedFile} yet. Run a search that
              touches this file to see them here.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {snippetsForFile.map((r) => (
                <li key={`${r.file}-${r.function}-${r.start_line}`}>
                  <p className="text-[0.82rem] text-white/80">
                    {r.function}() · lines {r.start_line}–{r.end_line}
                  </p>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-lineDark bg-black/40 p-3 text-[0.76rem] leading-relaxed text-white/85">
                    <code>{r.code}</code>
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}