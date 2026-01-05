const API_BASE = 'http://localhost:4000/api/nutrition'
const AUTH_KEY = 'hc_user_token'

function getAuthHeaders() {
  const token = localStorage.getItem(AUTH_KEY)
  if (!token) return { 'Content-Type': 'application/json' }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

export async function searchNutrition(food_name, quantity, unit) {
  try {
    const res = await fetch(`${API_BASE}/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ food_name, quantity, unit })
    })
    if (!res.ok) throw new Error('Failed to fetch nutrition data')
    return await res.json()
  } catch (err) {
    console.error('Search nutrition error:', err)
    throw err
  }
}

export async function addEntry(entry) {
  try {
    const res = await fetch(`${API_BASE}/save`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(entry)
    })
    if (!res.ok) throw new Error('Failed to add entry')
    return await res.json()
  } catch (err) {
    console.error('Add entry error:', err)
    throw err
  }
}

export async function updateEntry(id, updates) {
  try {
    const res = await fetch(`${API_BASE}/entries/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    })
    if (!res.ok) throw new Error('Failed to update entry')
    return await res.json()
  } catch (err) {
    console.error('Update entry error:', err)
    throw err
  }
}

export async function deleteEntry(id) {
  try {
    const res = await fetch(`${API_BASE}/entries/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to delete entry')
    return await res.json()
  } catch (err) {
    console.error('Delete entry error:', err)
    throw err
  }
}

export async function previewNutrition(food_name, quantity, unit) {
  try {
    const res = await fetch(`${API_BASE}/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ food_name, quantity, unit })
    })
    if (!res.ok) throw new Error('Failed to fetch nutrition data')
    return await res.json()
  } catch (err) {
    console.error('Preview nutrition error:', err)
    throw err
  }
}

export async function saveNutritionEntry(food_name, quantity, unit, calories, protein, fat, carbs, spoonacular_id) {
  try {
    const res = await fetch(`${API_BASE}/save`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ food_name, quantity, unit, calories, protein, fat, carbs, spoonacular_id })
    })
    if (!res.ok) throw new Error('Failed to save entry')
    return await res.json()
  } catch (err) {
    console.error('Save nutrition error:', err)
    throw err
  }
}

export async function getDailyEntries() {
  try {
    const res = await fetch(`${API_BASE}/daily-entries`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch entries')
    return await res.json()
  } catch (err) {
    console.error('Get daily entries error:', err)
    return []
  }
}

export async function getDailySummary() {
  try {
    const res = await fetch(`${API_BASE}/daily-summary`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch summary')
    return await res.json()
  } catch (err) {
    console.error('Get daily summary error:', err)
    return {
      total_calories: 0,
      total_protein: 0,
      total_fat: 0,
      total_carbs: 0,
      total_items: 0
    }
  }
}

export async function deleteNutritionEntry(id) {
  try {
    const res = await fetch(`${API_BASE}/entries/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to delete entry')
    return await res.json()
  } catch (err) {
    console.error('Delete nutrition error:', err)
    throw err
  }
}

export async function getAllEntries() {
  try {
    const res = await fetch(`${API_BASE}/entries`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch entries')
    return await res.json()
  } catch (err) {
    console.error('Get all entries error:', err)
    return []
  }
}

export async function updateNutritionEntry(id, quantity, unit) {
  try {
    const res = await fetch(`${API_BASE}/entries/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ quantity, unit })
    })
    if (!res.ok) throw new Error('Failed to update entry')
    return await res.json()
  } catch (err) {
    console.error('Update nutrition error:', err)
    throw err
  }
}

export async function getStatsForDate(date) {
  try {
    const res = await fetch(`${API_BASE}/stats/${date}`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch stats')
    return await res.json()
  } catch (err) {
    console.error('Get stats error:', err)
    return {
      total_items: 0,
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0
    }
  }
}

export async function getRecommendations() {
  try {
    const res = await fetch(`${API_BASE}/recommendations`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch recommendations')
    return await res.json()
  } catch (err) {
    console.error('Get recommendations error:', err)
    return { recommendations: [] }
  }
}

export async function getAIAnalysis(period) {
  try {
    const res = await fetch(`${API_BASE}/ai-analysis`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ period })
    })
    if (!res.ok) throw new Error('Failed to fetch AI analysis')
    return await res.json()
  } catch (err) {
    console.error('Get AI analysis error:', err)
    throw err
  }
}

export async function getQuickTip() {
  try {
    const res = await fetch(`${API_BASE}/quick-tip`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch quick tip')
    return await res.json()
  } catch (err) {
    console.error('Get quick tip error:', err)
    return {
      tip: 'Stay hydrated and eat balanced meals.',
      badge: 'fallback'
    }
  }
}