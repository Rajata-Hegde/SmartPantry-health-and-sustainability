const LOCAL_KEY = 'hc_elders_v1'

const API_BASE =
  import.meta?.env?.VITE_API_BASE
    ? `${import.meta.env.VITE_API_BASE}/elders`
    : 'http://localhost:4000/api/elders'

const AUTH_KEY = 'hc_user_token'

function getAuthHeaders() {
  const token = localStorage.getItem(AUTH_KEY)
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

/* =========================
   Fallback helper
========================= */
async function fallbackFetch(fn) {
  try {
    return await fn()
  } catch (err) {
    console.warn('API failed → using localStorage', err.message)
    return null
  }
}

/* =========================
   Local storage helpers
========================= */
function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocal(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

/* =========================
   Normalizer
========================= */
function normalize(elder) {
  if (!elder) return null
  return {
    id: elder.id,
    name: elder.name || '',
    age: elder.age || null,
    gender: elder.gender || 'Other',
    conditions: elder.conditions || [],
    allergies: elder.allergies || '',
    meds: elder.meds || [],
    diet: elder.diet || '',
    created_at: elder.created_at,
    updated_at: elder.updated_at
  }
}

/* =========================
   API FUNCTIONS
========================= */

export async function loadElders() {
  const remote = await fallbackFetch(async () => {
    const res = await fetch(API_BASE, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return data.map(normalize)
  })

  if (remote !== null) return remote
  return loadLocal().map(normalize)
}

export async function addElder(elder) {
  const remote = await fallbackFetch(async () => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(elder)
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return normalize(data.elder)
  })

  if (remote !== null) return remote

  // fallback
  const list = loadLocal()
  const entry = {
    id: Date.now().toString(36),
    created_at: new Date().toISOString(),
    ...normalize(elder)
  }
  list.unshift(entry)
  saveLocal(list)
  return entry
}

export async function updateElder(id, patch) {
  const remote = await fallbackFetch(async () => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(patch)
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return normalize(data.elder)
  })

  if (remote !== null) return remote

  // fallback
  const list = loadLocal().map(e =>
    e.id === id
      ? { ...e, ...patch, updated_at: new Date().toISOString() }
      : e
  )
  saveLocal(list)
  return list.find(e => e.id === id)
}

export async function getElder(id) {
  const remote = await fallbackFetch(async () => {
    const res = await fetch(`${API_BASE}/${id}`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('API error')
    return normalize(await res.json())
  })

  if (remote !== null) return remote
  return loadLocal().find(e => e.id === id)
}

export async function deleteElder(id) {
  const remote = await fallbackFetch(async () => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('API error')
    return true
  })

  if (remote !== null) return true

  const list = loadLocal().filter(e => e.id !== id)
  saveLocal(list)
  return true
}
