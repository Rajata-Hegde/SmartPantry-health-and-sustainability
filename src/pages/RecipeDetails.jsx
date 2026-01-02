import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'

const API_BASE = 'http://localhost:4000'

export default function RecipeDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('hc_user_token')

    if (!token) {
      setError('Please login again')
      setLoading(false)
      return
    }

    fetch(`${API_BASE}/api/recipes/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => {
        setRecipe(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load recipe')
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="container">Loading recipe…</div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <NavBar />
        <div className="container">
          <p className="muted">{error}</p>
          <button className="btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </>
    )
  }

  return (
    <div>
      <NavBar />
      <main className="container stack">

        <button className="btn" onClick={() => navigate(-1)}>← Back</button>

        {/* TOP SECTION */}
        <div
          className="card wide"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            gap: 24,
            alignItems: 'center'
          }}
        >
          {/* IMAGE */}
          <img
            src={recipe.image}
            alt={recipe.title}
            style={{
              width: '100%',
              maxHeight: 280,
              objectFit: 'cover',
              borderRadius: 12
            }}
          />

          {/* INFO */}
          <div>
            <h2 style={{ marginTop: 0 }}>{recipe.title}</h2>

            <p className="muted" style={{ marginBottom: 12 }}>
              ⏱ {recipe.readyInMinutes} mins &nbsp;•&nbsp;
              🍽 Serves {recipe.servings}
            </p>

            <p className="small muted">
              This recipe is generated based on the pantry items you selected.
              Use it to reduce food waste and cook smarter.
            </p>
          </div>
        </div>

        {/* DETAILS SECTION */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.5fr',
            gap: 24
          }}
        >
          {/* INGREDIENTS */}
          <div className="card">
            <h3>Ingredients</h3>
            <ul style={{ paddingLeft: 18 }}>
              {recipe.ingredients?.map((item, idx) => (
                <li key={idx} style={{ marginBottom: 6 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* STEPS */}
          <div className="card">
            <h3>How to cook</h3>
            {recipe.steps?.length === 0 ? (
              <p className="muted">No steps available</p>
            ) : (
              <ol style={{ paddingLeft: 18 }}>
                {recipe.steps.map(step => (
                  <li
                    key={step.number}
                    style={{
                      marginBottom: 12,
                      lineHeight: 1.5
                    }}
                  >
                    {step.step}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}
