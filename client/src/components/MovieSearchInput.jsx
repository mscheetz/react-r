import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "../lib/api"

export default function MovieSearchInput({ onSelect }) {
  const [query, setQuery] = useState("")

  const { data: results = [] } = useQuery({
    queryKey: ["movie-search", query],
    queryFn: () => api.get(`/movies/search?q=${encodeURIComponent(query)}`).then((r) => r.data),
    enabled: query.length >= 2,
  })

  return (
    <div className="relative">
      <input
        className="w-full rounded border px-3 py-2"
        placeholder="Search movies..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.length >= 2 && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded border bg-white shadow-lg">
          {results.map((m) => (
            <li
              key={m.tmdb_id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-100"
              onClick={() => { onSelect(m); setQuery("") }}
            >
              {m.poster_path && (
                <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt="" className="h-12 w-8 rounded object-cover" />
              )}
              <div>
                <p className="text-sm font-medium">{m.title}</p>
                {m.release_year && <p className="text-xs text-gray-500">{m.release_year}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}