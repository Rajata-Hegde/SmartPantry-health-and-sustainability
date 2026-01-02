import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login } from '../auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  // Redirect user back to intended page after login
  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center">
      <div className="card login-card">

        {/* BRANDING */}
        <h1 className="brand">SmartPantry AI</h1>
        <p className="muted">
          Secure access to your health & pantry dashboard
        </p>

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className="stack">

          <label className="label">
            <span className="label-text">Email</span>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="label">
            <span className="label-text">Password</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {/* ERROR MESSAGE */}
          {error && <div className="error">{error}</div>}

          <button
            className="btn primary"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* FOOTER LINKS */}
        <p className="small muted">
          <a href="/forgot-password">Forgot password?</a> ·{' '}
          <a href="/register">Create an account</a>
        </p>

      </div>
    </div>
  )
}
