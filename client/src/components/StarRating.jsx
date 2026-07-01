import { useState } from "react"
import api from "../lib/api"
import { useAuth } from "../lib/auth"

export default function StarRating({ listId, userRating, avgRating, ratingCount, onRated }) {
  const { user } = useAuth()
  const [hover, setHover] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const handleRate = async (score) => {
    if (!user) return
    setSubmitting(true)
    try {
      await api.post(`/lists/${listId}/rate`, { score })
      onRated?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {user && [1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          disabled={submitting}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => handleRate(star)}
          className={`text-xl ${star <= (hover || userRating || 0) ? "text-yellow-500" : "text-gray-300"} hover:text-yellow-500`}
        >
          ★
        </button>
      ))}
      <span className="text-sm text-gray-500">
        {avgRating > 0 ? `${avgRating.toFixed(1)} (${ratingCount} ratings)` : "No ratings"}
      </span>
    </div>
  )
}