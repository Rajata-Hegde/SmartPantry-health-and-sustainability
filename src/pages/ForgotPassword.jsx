import React, { useState } from 'react'
import { requestPasswordReset } from '../auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('')
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setStatus('If that email exists, a reset link was sent (check server logs).')
    } catch (err) {
      setStatus(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center">
      <div className="card login-card">
        <h1 className="brand">Forgot password</h1>
        <p className="muted">Enter your account email to receive a reset link</p>
        <form onSubmit={handleSubmit} className="stack">
          <label className="label">
            <span className="label-text">Email</span>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {status && <div className="muted small">{status}</div>}
          <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>
        <p className="small muted"><a href="/login">Back to sign in</a></p>
      </div>
    </div>
  )
}
