import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import api from "../lib/api"

export default function Home() {
  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: () => api.get("/lists").then((r) => r.data),
  })

  if (isLoading) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Movie Lists</h1>
      {lists.length === 0 && <p className="text-gray-500">No lists yet.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <Link key={list.id} to={`/lists/${list.id}`} className="block rounded-lg border bg-white p-4 shadow-sm hover:shadow-md">
            <h2 className="text-lg font-semibold">{list.title}</h2>
            {list.description && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{list.description}</p>}
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
              <span>by {list.creator_name}</span>
              <span>{list.item_count} movies</span>
              {list.rating_count > 0 && <span>★ {list.avg_rating.toFixed(1)} ({list.rating_count})</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}