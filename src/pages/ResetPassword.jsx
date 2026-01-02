import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { resetPassword } from '../auth'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  // 🔐 If token is missing, block access
  useEffect(() => {
    if (!token) {
      setError('Invalid or expired reset link.')
    }
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!token) return

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setError('')
    setLoading(true)

    try {
      await resetPassword(token, password)
      setSuccess('Password updated successfully. Redirecting to login…')

      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1500)
    } catch (err) {
      setError(err.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center">
      <div className="card login-card">
        <h1 className="brand">Reset password</h1>
        <p className="muted">Choose a new password for your account</p>

        {error && <div className="error">{error}</div>}
        {success && <div className="muted small">{success}</div>}

        {!success && (
          <form onSubmit={handleSubmit} className="stack">
            <label className="label">
              <span className="label-text">New password</span>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <label className="label">
              <span className="label-text">Confirm password</span>
              <input
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>

            <button
              className="btn primary"
              type="submit"
              disabled={loading || !token}
            >
              {loading ? 'Setting…' : 'Set password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
