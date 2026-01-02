const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const { authenticateToken } = require('../middleware/auth')

// Apply authentication middleware to all pantry routes
router.use(authenticateToken)

// GET /api/pantry - list only current user's items
router.get('/', async (req, res) => {
  try {
    const userId = req.user.user_id
    const q = await pool.query(
      'SELECT * FROM pantry_items WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200',
      [userId]
    )
    res.json(q.rows)
  } catch (err) {
    console.error('GET /api/pantry', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/pantry - create item for current user
router.post('/', async (req, res) => {
  const { item_name, quantity, unit, notes } = req.body
  const userId = req.user.user_id
  
  if (!item_name) return res.status(400).json({ error: 'Missing item_name' })
  
  try {
    const q = await pool.query(
      'INSERT INTO pantry_items (user_id,item_name,quantity,unit,notes,created_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *',
      [userId, item_name, quantity || 1, unit || null, notes || null]
    )
    res.json({ ok: true, item: q.rows[0] })
  } catch (err) {
    console.error('POST /api/pantry', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/pantry/:id - delete only if owned by current user
router.delete('/:id', async (req, res) => {
  const id = req.params.id
  const userId = req.user.user_id
  
  try {
    const result = await pool.query(
      'DELETE FROM pantry_items WHERE id=$1 AND user_id=$2',
      [id, userId]
    )
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Item not found or unauthorized' })
    }
    
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/pantry/:id', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
