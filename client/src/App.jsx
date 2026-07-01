import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import CreateList from './pages/CreateList'
import ListDetail from './pages/ListDetail'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/lists/new" element={<CreateList />} />
          <Route path="/lists/:id" element={<ListDetail />} />
          <Route path="/lists/:id/edit" element={<CreateList />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}