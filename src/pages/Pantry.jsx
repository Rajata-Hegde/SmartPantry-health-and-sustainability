import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { loadPantryItems, savePantryItem, deletePantryItem } from '../pantry'

const COMMON_UNITS = [
  'kg', 'g', 'ltr', 'ml', 'pcs', 'pack', 'box', 'cup', 'tbsp', 'tsp'
]

export default function Pantry() {
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [selected, setSelected] = useState([])
  const [sort, setSort] = useState('recent')
  const [status, setStatus] = useState('')

  // Inline edit state
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [editUnit, setEditUnit] = useState('pcs')

  // Recipes
  const [recipes, setRecipes] = useState([])
  const [summary, setSummary] = useState('')

  /* ================= LOAD PANTRY ================= */
  useEffect(() => {
    refresh()
  }, [sort])

  async function refresh() {
    const list = await loadPantryItems()
    let sorted = [...(list || [])]

    if (sort === 'alpha') {
      sorted.sort((a, b) => a.item_name.localeCompare(b.item_name))
    }

    setItems(sorted)
    setSelected(sorted.map(i => i.item_name)) // select all by default
  }

  /* ================= DELETE ================= */
  async function handleDelete(id) {
    if (!window.confirm('Delete this item?')) return
    await deletePantryItem(id)
    refresh()
  }

  /* ================= EDIT ================= */
  function startEdit(item) {
    setEditingId(item.id)
    setEditName(item.item_name)
    setEditQty(item.quantity)
    setEditUnit(item.unit)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(item) {
    const trimmedName = editName.trim()
    if (!trimmedName) {
      setStatus('Item name cannot be empty')
      return
    }

    // Duplicate check
    const duplicate = items.some(
      i =>
        i.id !== item.id &&
        i.item_name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (duplicate) {
      setStatus('Another item with same name exists')
      return
    }

    await savePantryItem({
      id: item.id, // 🔥 UPDATE, NOT INSERT
      item_name: trimmedName,
      quantity: Number(editQty) || 1,
      unit: editUnit,
      notes: null
    })

    setEditingId(null)
    setStatus('Item updated')
    refresh()
  }

  /* ================= SELECT ================= */
  function toggleSelect(name) {
    setSelected(prev =>
      prev.includes(name)
        ? prev.filter(i => i !== name)
        : [...prev, name]
    )
  }

  /* ================= RECIPES ================= */
  async function getRecipes() {
    if (selected.length === 0) {
      setStatus('Select at least one item')
      return
    }

    const token = localStorage.getItem('hc_user_token')
    setStatus('Finding recipes...')

    try {
      const res = await fetch(
        'http://localhost:4000/api/recipes/from-pantry',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ ingredients: selected })
        }
      )

      if (!res.ok) throw new Error()

      const data = await res.json()
      setRecipes(data)
      setSummary(`🍳 ${data.length} recipes you can cook`)
      setStatus('')
    } catch {
      setStatus('Failed to fetch recipes')
    }
  }

  /* ================= UI ================= */
  return (
    <div>
      <NavBar />

      <main className="container">
        <div className="stack">

          {/* HEADER */}
          <div className="card wide">
            <h2>Smart Pantry</h2>
            <p className="muted">
              Edit items inline, manage inventory, and generate recipes instantly.
            </p>
          </div>

          {/* PANTRY LIST */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>My Pantry</h3>
              <select
                className="input"
                style={{ width: 200 }}
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="recent">Recently added</option>
                <option value="alpha">Alphabetical (A–Z)</option>
              </select>
            </div>

            {items.map(item => (
              <div
                key={item.id}
                className="card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr 90px 90px 90px 90px',
                  gap: 10,
                  alignItems: 'center'
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(item.item_name)}
                  onChange={() => toggleSelect(item.item_name)}
                />

                {/* NAME */}
                {editingId === item.id ? (
                  <input
                    className="input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                ) : (
                  <strong>{item.item_name}</strong>
                )}

                {/* QTY */}
                {editingId === item.id ? (
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={editQty}
                    onChange={e => setEditQty(e.target.value)}
                  />
                ) : (
                  <span>{item.quantity}</span>
                )}

                {/* UNIT */}
                {editingId === item.id ? (
                  <select
                    className="input"
                    value={editUnit}
                    onChange={e => setEditUnit(e.target.value)}
                  >
                    {COMMON_UNITS.map(u => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                ) : (
                  <span>{item.unit}</span>
                )}

                {/* ACTIONS */}
                {editingId === item.id ? (
                  <>
                    <button className="btn primary" onClick={() => saveEdit(item)}>
                      Save
                    </button>
                    <button className="btn" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button className="btn" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}

            <button
              className="btn primary"
              style={{ marginTop: 16 }}
              onClick={getRecipes}
            >
              Get recipes from pantry
            </button>

            {status && <p className="muted small">{status}</p>}
          </div>

          {/* RECIPES (SMALL CARDS – FIXED UI) */}
          {summary && (
            <div className="card">
              <h3>{summary}</h3>

              <div
                className="grid"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 16
                }}
              >
                {recipes.map(r => (
                  <div
                    key={r.id}
                    className="card clickable"
                    onClick={() => navigate(`/recipes/${r.id}`)}
                    style={{ padding: 0, overflow: 'hidden' }}
                  >
                    <img
                      src={r.image}
                      alt={r.title}
                      style={{
                        width: '100%',
                        height: 140,
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{ padding: 12 }}>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: 15 }}>
                        {r.title}
                      </h4>
                      <p className="muted small" style={{ margin: 0 }}>
                        Uses {r.usedIngredientCount} •
                        Needs {r.missedIngredientCount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
