import React, { useEffect, useState, useRef } from 'react'
import { loadElders, addElder, updateElder, deleteElder } from '../elders'
import { UserIcon } from '../components/Icons'

const defaultConditions = [
  'Diabetes',
  'Hypertension',
  'Cardiovascular',
  'COPD',
  'Arthritis'
]

/* ===============================
   EMPTY STATE
================================ */
function EmptyState({ onAdd }) {
  return (
    <div className="card">
      <h3>No elder profiles yet</h3>
      <p className="muted">
        Create an elder profile to store medical conditions, allergies, and
        medicines for safer food and health recommendations.
      </p>
      <button className="btn primary" onClick={onAdd}>
        Add first elder
      </button>
    </div>
  )
}

/* ===============================
   PROFILE CARD
================================ */
function ProfileCard({ elder, onOpen, onDelete }) {
  return (
    <article
      className="card feature-card"
      onClick={() => onOpen(elder)}
      style={{ cursor: 'pointer' }}
    >
      <div className="feature-top">
        <div className="icon-wrap">
          <UserIcon />
        </div>
        <div>
          <h3 style={{ margin: 0 }}>{elder.name}</h3>
          <div className="muted small">
            Age {elder.age} • {elder.gender} • {elder.diet || '—'}
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button
          className="btn"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(elder)
          }}
        >
          View
        </button>
        <button
          className="btn"
          style={{ marginLeft: 8 }}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(elder.id)
          }}
        >
          Delete
        </button>
      </div>
    </article>
  )
}

/* ===============================
   PROFILE FORM (WITH ALLERGIES + VOICE)
================================ */
function ProfileForm({ initial = {}, onCancel, onSave }) {
  const [name, setName] = useState(initial.name || '')
  const [age, setAge] = useState(initial.age || '')
  const [gender, setGender] = useState(initial.gender || 'Other')

  const [conditions, setConditions] = useState(initial.conditions || [])
  const [customCondition, setCustomCondition] = useState('')

  const [allergies, setAllergies] = useState(initial.allergies || '')

  const [meds, setMeds] = useState(initial.meds || [])
  const [customMed, setCustomMed] = useState('')

  const [diet, setDiet] = useState(initial.diet || 'Non-veg')

  // 🎙 Voice input for medicines
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)

  function toggleCondition(c) {
    setConditions((s) =>
      s.includes(c) ? s.filter((x) => x !== c) : [...s, c]
    )
  }

  function toggleMed(m) {
    setMeds((s) =>
      s.includes(m) ? s.filter((x) => x !== m) : [...s, m]
    )
  }

  function addCustomCondition() {
    if (!customCondition.trim()) return
    toggleCondition(customCondition.trim())
    setCustomCondition('')
  }

  function addCustomMed() {
    if (!customMed.trim()) return
    toggleMed(customMed.trim())
    setCustomMed('')
  }

  // 🎙 VOICE FOR MEDICINES
  function startMedVoice() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'

    recognition.onresult = (e) => {
      const spoken = e.results[0][0].transcript
      spoken.split(',').forEach((word) => {
        const med = word.trim()
        if (med && !meds.includes(med)) {
          setMeds((prev) => [...prev, med])
        }
      })
    }

    recognition.onend = () => setListening(false)
    recognition.start()
    setListening(true)
    recognitionRef.current = recognition
  }

  function stopMedVoice() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function submit(e) {
    e.preventDefault()

    onSave({
      name,
      age,
      gender,
      conditions,
      allergies, // ✅ FIXED
      meds,
      diet
    })
  }

  return (
    <form onSubmit={submit} className="stack">
      {/* BASIC INFO */}
      <label className="label">
        <span className="label-text">Name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <div style={{ display: 'flex', gap: 10 }}>
        <label className="label" style={{ flex: 1 }}>
          <span className="label-text">Age</span>
          <input type="number" className="input" value={age} onChange={(e) => setAge(e.target.value)} required />
        </label>

        <label className="label" style={{ flex: 1 }}>
          <span className="label-text">Gender</span>
          <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </label>
      </div>

      {/* CONDITIONS */}
      <div>
        <div className="label-text">Medical conditions</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {defaultConditions.map((c) => (
            <button
              key={c}
              type="button"
              className={`btn ${conditions.includes(c) ? 'primary' : ''}`}
              onClick={() => toggleCondition(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            className="input"
            placeholder="Add condition"
            value={customCondition}
            onChange={(e) => setCustomCondition(e.target.value)}
          />
          <button type="button" className="btn" onClick={addCustomCondition}>
            Add
          </button>
        </div>
      </div>

      {/* ALLERGIES ✅ FIXED */}
      <div>
        <label className="label">
          <span className="label-text">Allergies</span>
          <input
            className="input"
            placeholder="e.g. Milk, Peanuts, Penicillin"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
          />
        </label>
        <p className="muted small">
          Enter known allergies separated by commas
        </p>
      </div>

      {/* MEDICINES WITH VOICE */}
      <div>
        <div className="label-text">Current medicines</div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {meds.map((m) => (
            <button key={m} type="button" className="btn primary" onClick={() => toggleMed(m)}>
              {m}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            className="input"
            placeholder="Add medicine"
            value={customMed}
            onChange={(e) => setCustomMed(e.target.value)}
          />
          <button type="button" className="btn" onClick={addCustomMed}>
            Add
          </button>
          <button type="button" className="btn" onClick={listening ? stopMedVoice : startMedVoice}>
            {listening ? 'Stop 🎙' : 'Speak 🎙'}
          </button>
        </div>

        <p className="muted small">
          Tip: You can say “Metformin, Aspirin, Vitamin D”
        </p>
      </div>

      {/* DIET */}
      <div>
        <div className="label-text">Dietary preference</div>
        <label>
          <input type="radio" checked={diet === 'Veg'} onChange={() => setDiet('Veg')} /> Veg
        </label>
        <label style={{ marginLeft: 12 }}>
          <input type="radio" checked={diet === 'Non-veg'} onChange={() => setDiet('Non-veg')} /> Non-veg
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary">
          Save profile
        </button>
      </div>
    </form>
  )
}

/* ===============================
   MAIN PAGE
================================ */
export default function Profiles() {
  const [elders, setElders] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    const list = await loadElders()
    setElders(list || [])
  }

  function handleSave(payload) {
    ;(async () => {
      if (editing) await updateElder(editing.id, payload)
      else await addElder(payload)

      setShowForm(false)
      refresh()
    })()
  }

  return (
    <main className="container">
      <div className="stack">
        <div className="card wide">
          <h2>Elder Profiles</h2>
          <p className="muted">
            Store elder medical conditions, allergies, and medicines for safe
            nutrition and health recommendations.
          </p>
          <button className="btn primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            Add elder
          </button>
        </div>

        {elders.length === 0 ? (
          <EmptyState onAdd={() => setShowForm(true)} />
        ) : (
          <section className="feature-grid">
            {elders.map((e) => (
              <ProfileCard
                key={e.id}
                elder={e}
                onOpen={(el) => { setEditing(el); setShowForm(true) }}
                onDelete={async (id) => { await deleteElder(id); refresh() }}
              />
            ))}
          </section>
        )}

        {showForm && (
          <div className="card">
            <h3>{editing ? 'Edit profile' : 'New elder profile'}</h3>
            <ProfileForm
              initial={editing || {}}
              onCancel={() => setShowForm(false)}
              onSave={handleSave}
            />
          </div>
        )}
      </div>
    </main>
  )
}
