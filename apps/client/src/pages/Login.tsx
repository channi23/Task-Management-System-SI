import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'
import { Meteors } from '@/components/ui/meteors'
import { TextAnimate } from '@/components/ui/text-animate'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email, password)
      navigate('/tasks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden px-4">
      <Meteors />

      <TextAnimate
        as="h1"
        animation="blurInUp"
        by="word"
        className="relative z-10 text-center text-3xl font-semibold"
      >
        Welcome back
      </TextAnimate>

      <div className="relative z-10 w-full max-w-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <InteractiveHoverButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Logging in...' : 'Log in'}
          </InteractiveHoverButton>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="text-foreground underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
