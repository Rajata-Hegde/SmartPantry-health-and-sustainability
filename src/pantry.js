const LOCAL_KEY = 'hc_pantry_v1'
const API_BASE = 'http://localhost:4000/api/pantry'
const AUTH_KEY = 'hc_user_token'

function getAuthHeaders() {
  const token = localStorage.getItem(AUTH_KEY)
  if (!token) return {}
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to load pantry', e)
    return []
  }
}

function saveLocal(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

export async function loadPantryItems() {
  try {
    const res = await fetch(API_BASE, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return data
  } catch (err) {
    console.warn('Pantry API failed, using localStorage', err.message)
    return loadLocal()
  }
}

export async function savePantryItem(item) {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(item)
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return data.item || data
  } catch (err) {
    console.warn('Pantry save failed, falling back to local', err.message)
    const list = loadLocal()
    const entry = { id: Date.now().toString(36), ...item, created_at: new Date().toISOString() }
    list.unshift(entry)
    saveLocal(list)
    return entry
  }
}

export async function deletePantryItem(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('API error')
    return true
  } catch (err) {
    console.warn('Pantry delete failed, removing from local', err.message)
    const list = loadLocal().filter((i) => String(i.id) !== String(id))
    saveLocal(list)
    return true
  }
}

export function clearPantry() {
  localStorage.removeItem(LOCAL_KEY)
}
