import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../lib/auth"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState("")
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    try { await register(email, password, displayName); navigate("/") }
    catch (err) { setError(err.response?.data?.detail || "Registration failed") }
  }

  return (
    <div className="mx-auto mt-20 max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Create account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input className="rounded border px-3 py-2" type="text" placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <input className="rounded border px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="rounded border px-3 py-2" type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" type="submit">Register</button>
      </form>
      <p className="mt-4 text-sm text-gray-600">Already have an account? <Link to="/login" className="text-blue-600 underline">Sign in</Link></p>
    </div>
  )
}