import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../auth'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center">
      <div className="card login-card">
        <h1 className="brand">Create account</h1>
        <p className="muted">Register for provider access</p>
        <form onSubmit={handleSubmit} className="stack">
          <label className="label">
            <span className="label-text">Full name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="label">
            <span className="label-text">Email</span>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="label">
            <span className="label-text">Password</span>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="small muted">Already have an account? <a href="/login">Sign in</a></p>
      </div>
    </div>
  )
}
