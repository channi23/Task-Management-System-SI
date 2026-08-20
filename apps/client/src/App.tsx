import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Tasks from '@/pages/Tasks'

function Root() {
  const { token } = useAuth()
  return <Navigate to={token ? '/tasks' : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
