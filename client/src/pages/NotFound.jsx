import { Link } from "react-router-dom"

export default function NotFound() {
  return (
    <div className="mt-20 text-center">
      <h1 className="text-4xl font-bold text-gray-400">404</h1>
      <p className="mt-2 text-gray-500">Page not found.</p>
      <Link to="/" className="mt-4 inline-block text-blue-600 underline">Go home</Link>
    </div>
  )
}