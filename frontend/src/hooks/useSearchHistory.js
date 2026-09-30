import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'codelens-search-history'
const MAX_HISTORY = 8

export default function useSearchHistory() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)

      if (saved) {
        const parsed = JSON.parse(saved)

        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch (error) {
      console.error('Could not load search history:', error)
    }
  }, [])

  const addToHistory = useCallback((query) => {
    const cleanQuery = query.trim()

    if (!cleanQuery) {
      return
    }

    setHistory((currentHistory) => {
      const updatedHistory = [
        cleanQuery,
        ...currentHistory.filter(
          (item) => item !== cleanQuery
        ),
      ].slice(0, MAX_HISTORY)

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updatedHistory)
        )
      } catch (error) {
        console.error('Could not save search history:', error)
      }

      return updatedHistory
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Could not clear search history:', error)
    }
  }, [])

  return {
    history,
    addToHistory,
    clearHistory,
  }
}
