'use client'

// Tailwind-styled address autocomplete combobox over the Geoapify API.
// Behavior:
//   - debounced 300ms, fires only when query length >= 3
//   - aborts in-flight requests on each new keystroke
//   - keyboard nav (↑/↓/Enter/Escape) with roving aria-activedescendant
//   - calls onSelect with the parsed parts so the parent form can populate
//     city/state/zip fields (kept editable so users can correct mis-parses)

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  autocompleteAddress,
  type GeoapifySuggestion,
} from '@/lib/n400/geoapify'

const DEBOUNCE_MS = 300
const MIN_CHARS = 3

export interface AddressSelection {
  street: string
  city: string
  stateCode: string
  zip: string
  formatted: string
  lat: number
  lon: number
}

export function AddressAutocomplete({
  apiKey,
  onSelect,
  onInputChange,
  placeholder = '123 Main St, Houston, TX',
  defaultValue = '',
  required = true,
}: {
  apiKey: string
  onSelect: (selection: AddressSelection) => void
  // Fired on manual keystrokes (not on programmatic commit). Lets the parent
  // discard coordinates from a previous selection once the user edits the
  // street by hand, so a stale point never drives the district lookup.
  onInputChange?: () => void
  placeholder?: string
  defaultValue?: string
  required?: boolean
}) {
  const inputId = useId()
  const listboxId = `${inputId}-listbox`

  const [query, setQuery] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<GeoapifySuggestion[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const justSelectedRef = useRef(false)

  // Effect: debounced fetch on query change.
  useEffect(() => {
    if (justSelectedRef.current) {
      // Suppress the fetch that fires when we set the input to the formatted address.
      justSelectedRef.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < MIN_CHARS) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const results = await autocompleteAddress({
          query: query.trim(),
          apiKey,
          signal: controller.signal,
          limit: 5,
        })
        if (controller.signal.aborted) return
        setSuggestions(results)
        setActiveIndex(results.length > 0 ? 0 : -1)
        setIsOpen(true)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        // Network/API errors silently collapse the dropdown — user can still
        // type a free-form address; the server-side Geocodio call is the
        // ultimate validation step.
        setSuggestions([])
        setIsOpen(false)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, apiKey])

  // Cleanup any pending request when unmounted.
  useEffect(() => () => abortRef.current?.abort(), [])

  const commit = useCallback(
    (s: GeoapifySuggestion) => {
      justSelectedRef.current = true
      setQuery(s.formatted)
      setSuggestions([])
      setIsOpen(false)
      setActiveIndex(-1)
      onSelect({
        street: s.street,
        city: s.city,
        stateCode: s.stateCode,
        zip: s.zip,
        formatted: s.formatted,
        lat: s.lat,
        lon: s.lon,
      })
    },
    [onSelect],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault()
        commit(suggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="relative">
      <input
        id={inputId}
        name="street"
        type="text"
        autoComplete="off"
        spellCheck={false}
        required={required}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onInputChange?.()
        }}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onBlur={() => {
          // Defer so a click on a listbox option fires before the dropdown closes.
          setTimeout(() => setIsOpen(false), 100)
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          ...
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                // mousedown fires before blur — keep dropdown open until commit.
                e.preventDefault()
                commit(s)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-4 py-3 cursor-pointer text-sm ${
                i === activeIndex ? 'bg-teal-50 text-teal-900' : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              {s.formatted}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
