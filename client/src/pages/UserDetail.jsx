import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import api from "../lib/api"

export default function UserDetail() {
  const { id } = useParams()

  const { data: user } = useQuery({
    queryKey: ["user", id],
    queryFn: () => api.get(`/users/${id}`).then((r) => r.data),
  })

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["user-lists", id],
    queryFn: () => api.get(`/users/${id}/lists`).then((r) => r.data),
  })

  if (!user) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{user.display_name} Lists</h1>

      <div className="mb-6 flex items-center gap-4 text-sm text-gray-500">
        <span>{user.list_count} {user.list_count === 1 ? "list" : "lists"}</span>
        {user.rating_count > 0 && <span>★ {user.avg_rating.toFixed(1)} avg rating</span>}
      </div>

      {isLoading && <p className="text-gray-500">Loading lists...</p>}
      {!isLoading && lists.length === 0 && <p className="text-gray-500">No lists yet.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <Link key={list.id} to={`/lists/${list.id}`} className="block rounded-lg border bg-white p-4 shadow-sm hover:shadow-md">
            <h2 className="text-lg font-semibold">{list.title}</h2>
            {list.description && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{list.description}</p>}
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
              <span>{list.item_count} movies</span>
              {list.rating_count > 0 && <span>★ {list.avg_rating.toFixed(1)} ({list.rating_count})</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}