import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "../lib/api"
import { useAuth } from "../lib/auth"
import StarRating from "../components/StarRating"
import CommentSection from "../components/CommentSection"

export default function ListDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["list", id],
    queryFn: () => api.get(`/lists/${id}`).then((r) => r.data),
  })

  const favMutation = useMutation({
    mutationFn: () => api.post(`/lists/${id}/favorite`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["list", id] }),
  })

  if (isLoading) return <p className="text-gray-500">Loading...</p>
  if (error) return <p className="text-red-600">List not found.</p>

  return (
    <div>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => favMutation.mutate()}
              className={`cursor-pointer text-2xl ${list.is_favorited ? "text-yellow-500" : "text-gray-300"} hover:text-yellow-500`}
            >
              ★
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold">{list.title}</h1>
            {list.description && <p className="mt-2 text-gray-600">{list.description}</p>}
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>by <Link to={`/users/${list.user_id}`} className="text-blue-600 hover:underline">{list.creator_name}</Link></span>
              <span>{list.item_count} movies</span>
            </div>
          </div>
        </div>
        {user?.id === list.user_id && (
          <Link to={`/lists/${id}/edit`} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100">Edit</Link>
        )}
      </div>

      <div className="mt-4">
        <p>
          Rating: {list.avg_rating.toFixed(1)} ({list.rating_count} votes)
        </p>
        {user && (
          <StarRating
            listId={id}
            avgRating={list.avg_rating}
            ratingCount={list.rating_count}
            onRated={() => queryClient.invalidateQueries({ queryKey: ["list", id] })}
          />
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {list.items.map((item) => (
          <div key={item.id} className="rounded-lg border bg-white p-3 shadow-sm">
            {item.poster_path && (
              <img src={`https://image.tmdb.org/t/p/w200${item.poster_path}`} alt={item.title} className="mx-auto mb-2 h-48 w-full rounded object-cover" />
            )}
            <p className="text-sm font-medium">{item.title}</p>
            {item.release_year && <p className="text-xs text-gray-500">{item.release_year}</p>}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <CommentSection listId={id} />
      </div>
    </div>
  )
}
