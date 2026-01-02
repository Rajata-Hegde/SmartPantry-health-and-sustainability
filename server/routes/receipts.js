const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const { authenticateToken } = require('../middleware/auth')
const multer = require('multer')
const upload = multer({ dest: './tmp' })
const { spawn } = require('child_process')
const path = require('path')

// Apply authentication middleware to all receipt routes
router.use(authenticateToken)

// Create receipt with items in a transaction
router.post('/', async (req, res) => {
  const { store_name, bill_number, receipt_date, total_amount, items } = req.body
  const userId = req.user.user_id
  
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Missing items array' })
  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const insertReceipt = await client.query(
        `INSERT INTO receipts (user_id, store_name, bill_number, receipt_date, total_amount, created_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`,
        [userId, store_name || null, bill_number || null, receipt_date || null, total_amount || null]
      )
      const receipt = insertReceipt.rows[0]
      const itemPromises = items.map((it) => {
        return client.query(
          `INSERT INTO receipt_items (receipt_id, item_name, quantity, unit_price, total_price) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [receipt.id, it.name || it.item_name || null, it.qty || it.quantity || null, it.unit_price || null, it.total_price || null]
        )
      })
      const inserted = await Promise.all(itemPromises)
      await client.query('COMMIT')
      res.json({ ok: true, receipt, items: inserted.map(r => r.rows[0]) })
    } catch (err) {
      await client.query('ROLLBACK')
      console.error('POST /api/receipts transaction error', err)
      res.status(500).json({ error: 'Server error' })
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('POST /api/receipts connection error', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// simple listing - only user's own receipts
router.get('/', async (req, res) => {
  const userId = req.user.user_id
  try {
    const q = await pool.query(
      'SELECT * FROM receipts WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    )
    res.json(q.rows)
  } catch (err) {
    console.error('GET /api/receipts error', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router

// POST /api/receipts/scan - upload image and run OCR (python) -> returns parsed data
router.post('/scan', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const filePath = path.resolve(req.file.path)
  const py = path.resolve(__dirname, '../ocr/ocr_cli.py')
  try {
    const proc = spawn('python', [py, filePath], { timeout: 30000 })
    let out = ''
    let err = ''
    proc.stdout.on('data', (d) => { out += d.toString() })
    proc.stderr.on('data', (d) => { err += d.toString() })
    proc.on('close', (code) => {
      if (err) console.error('OCR stderr:', err)
      try {
        const parsed = JSON.parse(out)
        return res.json({ ok: true, parsed })
      } catch (e) {
        console.error('Failed to parse OCR output', e, out)
        return res.status(500).json({ error: 'OCR failed', detail: err || out })
      }
    })
  } catch (e) {
    console.error('OCR spawn error', e)
    return res.status(500).json({ error: 'Server OCR error' })
  }
})
