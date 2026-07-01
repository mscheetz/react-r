import { Link } from "react-router-dom"
import { useAuth } from "../lib/auth"

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="flex items-center justify-between border-b px-6 py-3">
      <Link to="/" className="text-xl font-bold">React-r</Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link to="/lists/new" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">+ New List</Link>
            <Link to={`/users/${user.id}`} className="text-sm text-gray-600 hover:text-gray-800">{user.display_name}</Link>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-800">Sign in</Link>
            <Link to="/register" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}