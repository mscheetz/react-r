import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "../lib/api"
import MovieSearchInput from "../components/MovieSearchInput"
import { useAuth } from "../lib/auth"

export default function CreateList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEdit = Boolean(id)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [items, setItems] = useState([])

  const { data: existing } = useQuery({
    queryKey: ["list", id],
    queryFn: () => api.get(`/lists/${id}`).then((r) => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setTitle(existing.title)
      setDescription(existing.description)
      setItems(existing.items.map((i) => ({ ...i, tempId: i.id })))
    }
  }, [existing])

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/lists", data),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["lists"] })
      navigate(`/lists/${r.data.id}/edit`)
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data) => api.put(`/lists/${id}`, data),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["lists"] })
      navigate("/")
    },
  })

  const addItemMutation = useMutation({
    mutationFn: ({ listId, movie }) => api.post(`/lists/${listId}/items`, movie),
  })

  const reorderMutation = useMutation({
    mutationFn: ({ listId, items }) => api.put(`/lists/${listId}/items/reorder`, { items }),
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!user) return navigate("/login")
    if (!isEdit) {
      createMutation.mutate({ title, description })
    } else {
      saveMutation.mutate({ title, description })
    }
  }

  const handleAddMovie = async (movie) => {
    if (!id) {
      setItems((prev) => [...prev, { ...movie, tempId: Date.now(), position: prev.length }])
      return
    }
    const r = await addItemMutation.mutateAsync({ listId: id, movie })
    queryClient.invalidateQueries({ queryKey: ["list", id] })
    setItems((prev) => [...prev, r.data])
  }

  const handleRemove = async (item) => {
    if (!item.id) {
      setItems((prev) => prev.filter((i) => i.tempId !== item.tempId))
      return
    }
    await api.delete(`/lists/${id}/items/${item.id}`)
    queryClient.invalidateQueries({ queryKey: ["list", id] })
    setItems((prev) => prev.filter((i) => i.id !== item.id))
  }

  const move = (index, dir) => {
    const next = [...items]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    next.forEach((it, i) => (it.position = i))
    setItems(next)
    if (id) reorderMutation.mutate({ listId: id, items: next.map((it) => ({ id: it.id, position: it.position })) })
  }

  if (!user) {
    return <p className="text-gray-500">Sign in to create a list.</p>
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">{isEdit ? "Edit List" : "New List"}</h1>

      <form onSubmit={handleCreate} className="mb-6 flex flex-col gap-4">
        <input className="rounded border px-3 py-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="rounded border px-3 py-2" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        {!isEdit ? 
          <div className="flex gap-2">
            <button className="flex-1 cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" type="submit">Create List</button>
            <button type="button" onClick={() => navigate(`/users/${user.id}`)} className="cursor-pointer rounded border px-4 py-2 text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        : <div className="flex gap-2">
            <button className="flex-1 cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" type="submit">Save List</button>
            <button type="button" onClick={() => navigate(`/users/${user.id}`)} className="cursor-pointer rounded border px-4 py-2 text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        }
      </form>

      {isEdit && (
        <>
          <MovieSearchInput onSelect={handleAddMovie} />
          <div className="mt-4 flex flex-col gap-2">
            {items.map((item, i) => (
              <div key={item.id || item.tempId} className="flex items-center gap-3 rounded border bg-white p-2">
                {item.poster_path && (
                  <img src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt="" className="h-12 w-8 rounded object-cover" />
                )}
                <p className="flex-1 text-sm">{item.title}</p>
                <button onClick={() => move(i, -1)} className="text-xs text-gray-500 hover:text-gray-700" disabled={i === 0}>▲</button>
                <button onClick={() => move(i, 1)} className="text-xs text-gray-500 hover:text-gray-700" disabled={i === items.length - 1}>▼</button>
                <button onClick={() => handleRemove(item)} className="text-xs text-red-500 hover:text-red-700">✕</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}