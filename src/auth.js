// ===============================
// AUTH CONFIG
// ===============================
const AUTH_KEY = 'hc_user_token'
const USER_KEY = 'hc_user'

const API_BASE =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  'http://localhost:4000/api'

// ===============================
// HELPERS
// ===============================
function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem(AUTH_KEY))
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Request failed')
  }
  return data
}

// ===============================
// AUTH ACTIONS
// ===============================
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const data = await handleResponse(res)

  // ✅ Store JWT
  localStorage.setItem(AUTH_KEY, data.token)

  // ✅ Store user info (for navbar / dashboard)
  saveUser({
    name: data.user?.name || '',
    email: data.user?.email || email
  })

  return data
}

export async function register(name, email, password) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  })

  return handleResponse(res)
}

// ===============================
// PASSWORD RESET
// ===============================
export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })

  // 🔒 Always return success message (avoid user enumeration)
  return handleResponse(res)
}

export async function resetPassword(token, password) {
  const res = await fetch(`${API_BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  })

  return handleResponse(res)
}

// ===============================
// LOGOUT
// ===============================
export function logout() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(USER_KEY)
}
