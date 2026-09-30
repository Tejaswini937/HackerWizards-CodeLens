// Talks to the CodeLens FastAPI backend.
// No mock data lives here — everything returned comes from the real API.

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * POST /search
 *
 * @param {string} query
 * @param {number} topK
 * @param {'semantic'|'hybrid'} strategy
 */
export async function searchCode(
  query,
  topK = 10,
  strategy = 'semantic'
) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        top_k: topK,
        strategy,
      }),
    })
  } catch (networkError) {
    throw new Error(
      'Could not reach the CodeLens backend. Is it running at ' +
        `${API_BASE_URL}?`
    )
  }

  if (!response.ok) {
    let detail = ''

    try {
      const body = await response.json()

      detail = body.detail
        ? ` — ${JSON.stringify(body.detail)}`
        : ''
    } catch {
      // Response wasn't JSON.
    }

    throw new Error(
      `Search request failed (${response.status})${detail}`
    )
  }

  return response.json()
}

/**
 * GET /health
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/health`)

  if (!response.ok) {
    throw new Error(
      `Health check failed (${response.status})`
    )
  }

  return response.json()
}