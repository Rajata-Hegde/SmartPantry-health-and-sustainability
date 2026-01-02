import { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import * as nutritionAPI from '../nutrition'

export default function NutritionTracker() {
  const [allEntries, setAllEntries] = useState([])
  const [food_name, setFoodName] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [unit, setUnit] = useState('g')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [sortField, setSortField] = useState('date_consumed')
  const [sortDirection, setSortDirection] = useState('desc')
  const [editingEntry, setEditingEntry] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [recommendations, setRecommendations] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dateStats, setDateStats] = useState(null)
  const [aiAnalysis, setAIAnalysis] = useState(null)
  const [aiPeriod, setAIPeriod] = useState('7days')
  const [aiLoading, setAILoading] = useState(false)
  const [quickTip, setQuickTip] = useState(null)
  const [tipLoading, setTipLoading] = useState(false)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const data = await nutritionAPI.getAllEntries()
      setAllEntries(data)
      loadRecommendations()
      loadQuickTip()
    } catch (err) {
      console.error('Failed to load entries:', err)
    }
  }

  const loadRecommendations = async () => {
    try {
      const recs = await nutritionAPI.getRecommendations()
      setRecommendations(recs)
    } catch (err) {
      console.error('Failed to load recommendations:', err)
    }
  }

  const loadQuickTip = async () => {
    try {
      setTipLoading(true)
      const tip = await nutritionAPI.getQuickTip()
      setQuickTip(tip)
    } catch (err) {
      console.error('Failed to load tip:', err)
    } finally {
      setTipLoading(false)
    }
  }

  const loadDateStats = async () => {
    try {
      setLoading(true)
      const stats = await nutritionAPI.getStatsForDate(selectedDate)
      setDateStats(stats)
      showStatus('Insights loaded successfully')
    } catch (err) {
      showStatus('Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  const loadAIAnalysis = async () => {
    try {
      setAILoading(true)
      const analysis = await nutritionAPI.getAIAnalysis(aiPeriod)
      setAIAnalysis(analysis)
    } catch (err) {
      showStatus('Failed to generate AI analysis')
    } finally {
      setAILoading(false)
    }
  }

  const handlePreview = async (e) => {
    e.preventDefault()
    if (!food_name || !quantity) {
      showStatus('Please fill in food name and quantity')
      return
    }

    try {
      setLoading(true)
      const response = await nutritionAPI.searchNutrition(food_name, quantity, unit)
      setPreview(response.preview || response)
    } catch (err) {
      showStatus('Food not found or API error')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      await nutritionAPI.addEntry({
        food_name: preview.food_name,
        quantity,
        unit,
        calories: preview.calories,
        protein: preview.protein,
        fat: preview.fat,
        carbs: preview.carbs,
        date_consumed: new Date().toISOString()
      })
      setFoodName('')
      setQuantity('100')
      setUnit('grams')
      setPreview(null)
      showStatus('Entry saved successfully')
      await loadData()
    } catch (err) {
      showStatus('Failed to save entry')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return
    try {
      await nutritionAPI.deleteEntry(id)
      showStatus('Entry deleted')
      await loadData()
    } catch (err) {
      showStatus('Failed to delete entry')
    }
  }

  const handleEdit = (entry) => {
    setEditingEntry({ ...entry })
  }

  const handleUpdateEntry = async () => {
    try {
      await nutritionAPI.updateEntry(editingEntry.id, {
        quantity: editingEntry.quantity,
        unit: editingEntry.unit
      })
      setEditingEntry(null)
      showStatus('Entry updated')
      await loadData()
    } catch (err) {
      showStatus('Failed to update entry')
    }
  }

  const showStatus = (msg) => {
    setStatus(msg)
    setTimeout(() => setStatus(''), 5000)
  }

  const sortEntries = (field) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortDirection(newDirection)
  }

  const sortedEntries = [...allEntries].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const summary = {
    total_calories: allEntries.reduce((sum, e) => sum + (parseFloat(e.calories) || 0), 0),
    total_protein: allEntries.reduce((sum, e) => sum + (parseFloat(e.protein) || 0), 0),
    total_fat: allEntries.reduce((sum, e) => sum + (parseFloat(e.fat) || 0), 0),
    total_carbs: allEntries.reduce((sum, e) => sum + (parseFloat(e.carbs) || 0), 0)
  }

  const macroBreakdown = {
    protein: summary.total_calories ? Math.round((summary.total_protein * 4) / summary.total_calories * 100) : 0,
    carbs: summary.total_calories ? Math.round((summary.total_carbs * 4) / summary.total_calories * 100) : 0,
    fat: summary.total_calories ? Math.round((summary.total_fat * 9) / summary.total_calories * 100) : 0
  }

  const calculateHealthGrade = () => {
    const calories = summary.total_calories
    const protein = summary.total_protein
    const carbs = summary.total_carbs
    const fat = summary.total_fat
    
    if (calories === 0) return { grade: '-', text: 'No data', color: '#65707a' }
    
    let score = 0
    if (calories >= 1500 && calories <= 2500) score += 30
    else if (calories >= 1200 && calories <= 3000) score += 20
    else score += 10
    
    if (protein >= summary.total_calories * 0.1 && protein <= summary.total_calories * 0.35) score += 30
    if (carbs >= summary.total_calories * 0.3 && carbs <= summary.total_calories * 0.65) score += 20
    if (fat >= summary.total_calories * 0.2 && fat <= summary.total_calories * 0.35) score += 20
    
    if (score >= 90) return { grade: 'A', text: 'Excellent nutrition', color: '#22c55e' }
    if (score >= 80) return { grade: 'B', text: 'Great balance', color: '#3b82f6' }
    if (score >= 70) return { grade: 'C', text: 'Good nutrition', color: '#f59e0b' }
    if (score >= 60) return { grade: 'D', text: 'Needs improvement', color: '#ef4444' }
    return { grade: 'F', text: 'Poor nutrition', color: '#dc2626' }
  }

  const healthGrade = calculateHealthGrade()

  return (
    <div>
      <NavBar />
      
      <main className="container">
        <div className="stack">
          {/* Header */}
          <div className="card wide">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0 }}>Nutrition Tracker</h2>
                <p className="muted">Monitor your daily nutrition intake</p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button 
                  className={activeTab === 'overview' ? 'btn primary' : 'btn'}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button 
                  className={activeTab === 'entries' ? 'btn primary' : 'btn'}
                  onClick={() => setActiveTab('entries')}
                >
                  Entries
                </button>
                <button 
                  className={activeTab === 'insights' ? 'btn primary' : 'btn'}
                  onClick={() => setActiveTab('insights')}
                >
                  Insights
                </button>
                <button 
                  className={activeTab === 'coach' ? 'btn primary' : 'btn'}
                  onClick={() => setActiveTab('coach')}
                >
                  Coach
                </button>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {status && (
            <div className="card" style={{ 
              padding: '14px 18px',
              backgroundColor: status.includes('Error') || status.includes('Failed') ? '#fff5f5' : '#f0fdf4',
              borderLeft: `4px solid ${status.includes('Error') || status.includes('Failed') ? '#ef4444' : '#22c55e'}`
            }}>
              {status}
            </div>
          )}

          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="card">
                  <div className="muted small" style={{ marginBottom: 8 }}>Total Calories</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>
                    {Math.round(summary.total_calories)}
                  </div>
                  <div className="muted small">kcal</div>
                </div>
                <div className="card">
                  <div className="muted small" style={{ marginBottom: 8 }}>Protein</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>
                    {Math.round(summary.total_protein)}
                  </div>
                  <div className="muted small">grams</div>
                </div>
                <div className="card">
                  <div className="muted small" style={{ marginBottom: 8 }}>Carbs</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>
                    {Math.round(summary.total_carbs)}
                  </div>
                  <div className="muted small">grams</div>
                </div>
                <div className="card">
                  <div className="muted small" style={{ marginBottom: 8 }}>Fat</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>
                    {Math.round(summary.total_fat)}
                  </div>
                  <div className="muted small">grams</div>
                </div>
              </div>

              {/* Health Grade & Macros */}
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div className="card">
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Health Grade</h3>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ 
                      fontSize: 72, 
                      fontWeight: 700, 
                      color: healthGrade.color,
                      lineHeight: 1,
                      marginBottom: 8
                    }}>
                      {healthGrade.grade}
                    </div>
                    <div className="muted">{healthGrade.text}</div>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Macronutrient Balance</h3>
                  <div className="stack" style={{ gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Protein</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{macroBreakdown.protein}%</span>
                      </div>
                      <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${macroBreakdown.protein}%`, 
                          backgroundColor: '#22c55e',
                          transition: 'width 0.8s ease'
                        }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Carbs</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{macroBreakdown.carbs}%</span>
                      </div>
                      <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${macroBreakdown.carbs}%`, 
                          backgroundColor: '#3b82f6',
                          transition: 'width 0.8s ease'
                        }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Fat</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{macroBreakdown.fat}%</span>
                      </div>
                      <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${macroBreakdown.fat}%`, 
                          backgroundColor: '#f59e0b',
                          transition: 'width 0.8s ease'
                        }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Food Form */}
              <div className="card">
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Add Food Entry</h3>
                <form onSubmit={handlePreview} className="stack">
                  <label className="label">
                    <span className="label-text">Food Item</span>
                    <input
                      className="input"
                      placeholder="e.g., chicken breast, rice, apple"
                      value={food_name}
                      onChange={(e) => setFoodName(e.target.value)}
                      required
                    />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    <label className="label">
                      <span className="label-text">Quantity</span>
                      <input
                        className="input"
                        type="number"
                        placeholder="100"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                    </label>

                    <label className="label">
                      <span className="label-text">Unit</span>
                      <select
                        className="input"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="cup">cup</option>
                        <option value="piece">piece</option>
                      </select>
                    </label>
                  </div>

                  <button className="btn primary" type="submit" disabled={loading}>
                    {loading ? 'Fetching...' : 'Get Nutrition Info'}
                  </button>
                </form>
              </div>

              {/* Preview */}
              {preview && (
                <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Preview: {preview.food_name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div className="muted small">Calories</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(preview.calories)}</div>
                    </div>
                    <div>
                      <div className="muted small">Protein</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(preview.protein)}g</div>
                    </div>
                    <div>
                      <div className="muted small">Fat</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(preview.fat)}g</div>
                    </div>
                    <div>
                      <div className="muted small">Carbs</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(preview.carbs)}g</div>
                    </div>
                  </div>
                  <button className="btn primary" onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Entry'}
                  </button>
                </div>
              )}

              {/* Quick Tip */}
              {quickTip && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>Daily Tip</h3>
                    <button className="btn" onClick={loadQuickTip} disabled={tipLoading}>
                      {tipLoading ? 'Loading...' : 'New Tip'}
                    </button>
                  </div>
                  <p style={{ margin: 0, lineHeight: 1.6 }}>{quickTip.tip}</p>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="card">
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Recommendations</h3>
                  <div className="stack">
                    {recommendations.map((rec, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 12,
                          borderLeft: `3px solid ${
                            rec.type === 'warning' ? '#f59e0b' :
                            rec.type === 'success' ? '#22c55e' : '#3b82f6'
                          }`,
                          backgroundColor: '#f8fafc',
                          borderRadius: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{rec.message}</span>
                        {rec.priority === 'high' && (
                          <span style={{ 
                            fontSize: 11, 
                            padding: '2px 8px', 
                            backgroundColor: '#ef4444', 
                            color: 'white', 
                            borderRadius: 4,
                            fontWeight: 600
                          }}>
                            HIGH
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'entries' && (
            <div className="card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>All Entries ({allEntries.length})</h3>
              {allEntries.length === 0 ? (
                <p className="muted">No entries yet. Add your first food item in the Overview tab.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                        <th onClick={() => sortEntries('food_name')} style={{ padding: 12, textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Food {sortField === 'food_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('quantity')} style={{ padding: 12, textAlign: 'right', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Quantity {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('calories')} style={{ padding: 12, textAlign: 'right', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Calories {sortField === 'calories' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('protein')} style={{ padding: 12, textAlign: 'right', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Protein {sortField === 'protein' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('fat')} style={{ padding: 12, textAlign: 'right', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Fat {sortField === 'fat' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('carbs')} style={{ padding: 12, textAlign: 'right', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Carbs {sortField === 'carbs' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('date_consumed')} style={{ padding: 12, textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Date {sortField === 'date_consumed' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEntries.map((entry) => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 12, fontWeight: 600 }}>{entry.food_name}</td>
                          <td style={{ padding: 12, textAlign: 'right' }}>{entry.quantity} {entry.unit}</td>
                          <td style={{ padding: 12, textAlign: 'right' }}>{Math.round(entry.calories)}</td>
                          <td style={{ padding: 12, textAlign: 'right' }}>{Math.round(entry.protein)}g</td>
                          <td style={{ padding: 12, textAlign: 'right' }}>{Math.round(entry.fat)}g</td>
                          <td style={{ padding: 12, textAlign: 'right' }}>{Math.round(entry.carbs)}g</td>
                          <td style={{ padding: 12 }}>{new Date(entry.date_consumed).toLocaleDateString()}</td>
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            <button
                              className="btn"
                              onClick={() => handleEdit(entry)}
                              style={{ padding: '4px 10px', fontSize: 13, marginRight: 6 }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn"
                              onClick={() => handleDelete(entry.id)}
                              style={{ padding: '4px 10px', fontSize: 13 }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Historical Insights</h3>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap' }}>
                <label className="label" style={{ flex: 1, minWidth: 150 }}>
                  <span className="label-text">Select Date</span>
                  <input
                    type="date"
                    className="input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </label>
                <button 
                  className="btn" 
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                >
                  Today
                </button>
                <button 
                  className="btn primary" 
                  onClick={loadDateStats}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load Insights'}
                </button>
              </div>
              
              {dateStats && (
                <>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Stats for {selectedDate}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
                    <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                      <div className="muted small">Calories</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(dateStats.total_calories)}</div>
                    </div>
                    <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                      <div className="muted small">Protein</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(dateStats.total_protein)}g</div>
                    </div>
                    <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                      <div className="muted small">Carbs</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(dateStats.total_carbs)}g</div>
                    </div>
                    <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                      <div className="muted small">Fat</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(dateStats.total_fat)}g</div>
                    </div>
                    <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                      <div className="muted small">Entries</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{dateStats.total_items}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'coach' && (
            <div className="card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>AI Nutrition Coach</h3>
              <div style={{ marginBottom: 16 }}>
                <label className="label">
                  <span className="label-text">Analysis Period</span>
                  <select
                    className="input"
                    value={aiPeriod}
                    onChange={(e) => setAIPeriod(e.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="1day">Last 24 Hours</option>
                    <option value="3days">Last 3 Days</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                  </select>
                </label>
                <button 
                  className="btn primary" 
                  onClick={loadAIAnalysis}
                  disabled={aiLoading}
                  style={{ marginTop: 12 }}
                >
                  {aiLoading ? 'Analyzing...' : 'Generate Analysis'}
                </button>
              </div>

              {aiLoading && (
                <div style={{ padding: 24, textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 8 }}>
                  <p className="muted">AI Coach is analyzing your nutrition data...</p>
                </div>
              )}

              {!aiLoading && aiAnalysis && (
                <>
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Stats Summary</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
                      <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                        <div className="muted small">Total Entries</div>
                        <div style={{ fontSize: 24, fontWeight: 600 }}>{aiAnalysis.stats.total_entries}</div>
                      </div>
                      <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                        <div className="muted small">Total Calories</div>
                        <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(aiAnalysis.stats.total_calories)}</div>
                      </div>
                      <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                        <div className="muted small">Avg Daily</div>
                        <div style={{ fontSize: 24, fontWeight: 600 }}>{aiAnalysis.stats.avg_daily_calories}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 16 }}>AI Analysis</h4>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {aiAnalysis.analysis}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Edit Modal */}
          {editingEntry && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 20
            }}>
              <div className="card" style={{ maxWidth: 400, width: '100%' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Edit Entry: {editingEntry.food_name}</h3>
                <div className="stack">
                  <label className="label">
                    <span className="label-text">Quantity</span>
                    <input
                      className="input"
                      type="number"
                      value={editingEntry.quantity}
                      onChange={(e) => setEditingEntry({ ...editingEntry, quantity: e.target.value })}
                    />
                  </label>
                  <label className="label">
                    <span className="label-text">Unit</span>
                    <select
                      className="input"
                      value={editingEntry.unit}
                      onChange={(e) => setEditingEntry({ ...editingEntry, unit: e.target.value })}
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="cup">cup</option>
                      <option value="piece">piece</option>
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn primary" onClick={handleUpdateEntry}>Update</button>
                    <button className="btn" onClick={() => setEditingEntry(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
