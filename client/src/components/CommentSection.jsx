import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "../lib/api"
import { useAuth } from "../lib/auth"

export default function CommentSection({ listId }) {
  const { user } = useAuth()
  const [body, setBody] = useState("")
  const queryClient = useQueryClient()

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", listId],
    queryFn: () => api.get(`/lists/${listId}/comments`).then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: () => api.post(`/lists/${listId}/comments`, { body }),
    onSuccess: () => {
      setBody("")
      queryClient.invalidateQueries({ queryKey: ["comments", listId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (commentId) => api.delete(`/lists/comments/${commentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", listId] }),
  })

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">Comments</h3>
      {user && (
        <div className="mb-4 flex gap-2">
          <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Add a comment..." value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50" disabled={!body.trim() || addMutation.isPending} onClick={() => addMutation.mutate()}>Post</button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded border bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{c.user_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                {user?.id === c.user_id && (
                  <button className="text-xs text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate(c.id)}>✕</button>
                )}
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-700">{c.body}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-gray-400">No comments yet.</p>}
      </div>
    </div>
  )
}