import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { savePantryItem } from '../pantry'

const AUTH_KEY = 'hc_user_token'

function getAuthHeaders() {
  const token = localStorage.getItem(AUTH_KEY)
  if (!token) return { 'Content-Type': 'application/json' }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

function Preview({ file }) {
  if (!file) return null
  const url = URL.createObjectURL(file)
  return <img src={url} alt="receipt preview" style={{maxWidth:'100%',borderRadius:10}} />
}

function fakeExtract(file) {
  // fallback mocked extractor used when server OCR is unavailable
  const name = (file && file.name) ? file.name.toLowerCase() : ''
  const items = []
  if (name.includes('milk')) items.push({ name: 'Milk', qty: '1L' })
  if (name.includes('bread')) items.push({ name: 'Bread', qty: '1 loaf' })
  if (name.includes('egg') || name.includes('eggs')) items.push({ name: 'Eggs', qty: '12' })
  if (items.length) return items
  return [
    { name: 'Whole Milk', qty: '1L' },
    { name: 'Bread (Sliced)', qty: '1' },
    { name: 'Bananas', qty: '6' }
  ]
}

export default function ReceiptScanner() {
  const [file, setFile] = useState(null)
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('')
  const inputRef = useRef()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  function onDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files && e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  function onChoose(e) {
    const f = e.target.files && e.target.files[0]
    if (f) setFile(f)
  }

  async function handleExtract() {
    if (!file) { setStatus('Please upload a receipt image first.'); return }
    setLoading(true)
    setStatus('Uploading and extracting...')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = localStorage.getItem(AUTH_KEY)
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const res = await fetch('http://localhost:4000/api/receipts/scan', {
        method: 'POST',
        headers: headers,
        body: fd
      })
      if (!res.ok) {
        // fallback to local extractor
        const extracted = fakeExtract(file)
        setItems(extracted)
        setStatus('Extraction (local fallback)')
        setLoading(false)
        return
      }
      const data = await res.json()
      const parsed = data.parsed || data
      if (parsed && parsed.items) {
        // normalize items to {name, qty}
        const mapped = parsed.items.map((it) => ({ name: it.name || it.item || it.item_name, qty: it.quantity || it.qty || it.quantity || it.total || '' }))
        setItems(mapped)
        setStatus('Extraction complete')
      } else {
        const extracted = fakeExtract(file)
        setItems(extracted)
        setStatus('Extraction (no items found, local fallback)')
      }
    } catch (err) {
      console.error('Extract error', err)
      const extracted = fakeExtract(file)
      setItems(extracted)
      setStatus('Extraction failed (local fallback)')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddToPantry() {
    if (!items.length) { setStatus('No items to add') ; return }
    // attempt to save as a receipt to backend first
    try {
      const payload = {
        store_name: file ? file.name : 'Unknown',
        bill_number: null,
        receipt_date: null,
        total_amount: null,
        items: items.map((it) => ({ name: it.name, quantity: it.qty || 1, unit_price: null, total_price: null }))
      }
      const res = await fetch('http://localhost:4000/api/receipts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      // Add each item to pantry
      for (const item of items) {
        await savePantryItem({ 
          item_name: item.name, 
          quantity: parseFloat(item.qty) || 1, 
          unit: null, 
          notes: null 
        })
      }
      setStatus('Saved receipt and added items to pantry')
      return data
    } catch (err) {
      // fallback to local pantry
      for (const item of items) {
        await savePantryItem({ 
          item_name: item.name, 
          quantity: parseFloat(item.qty) || 1, 
          unit: null, 
          notes: null 
        })
      }
      setStatus('Added to pantry (offline)')
    }
  }

  function handleBack() {
    navigate('/')
  }

  return (
    <div>
      <NavBar />
      <main className="container">
        <div className="stack">
          <div className="card wide">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h2 style={{margin:0}}>Receipt Scanner</h2>
                <p className="muted">Upload a receipt image and extract grocery/medicine items.</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div onDrop={onDrop} onDragOver={(e)=>e.preventDefault()} style={{padding:18,borderRadius:10,border:'2px dashed rgba(16,24,32,0.06)',display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{flex:'1 1 320px'}}>
                <div style={{fontWeight:600,marginBottom:8}}>Upload receipt</div>
                <div className="muted small">Drag & drop an image here or choose a file.</div>
                <div style={{marginTop:12}}>
                  <input ref={inputRef} type="file" accept="image/*" onChange={onChoose} />
                </div>
              </div>
              <div style={{flex:'0 0 320px',textAlign:'center'}}>
                <Preview file={file} />
              </div>
            </div>

            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button className="btn primary" onClick={handleExtract}>Extract items</button>
              <button className="btn" onClick={()=>{ setFile(null); setItems([]); setStatus('') }}>Reset</button>
              <div style={{marginLeft:'auto'}} className="muted small">{status}</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{marginTop:0}}>Extracted items</h3>
            {items.length === 0 ? (
              <div className="muted">No items extracted yet.</div>
            ) : (
              <ul>
                {items.map((it, i) => (
                  <li key={i} style={{marginBottom:8}}>
                    <strong>{it.name}</strong> <span className="muted">— {it.qty}</span>
                  </li>
                ))}
              </ul>
            )}
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
              <button className="btn primary" onClick={handleAddToPantry}>Add to Pantry</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
