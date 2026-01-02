const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { pool } = require('../db')
const { sendResetEmail } = require('../utils/mailer')

const router = express.Router()

/* =====================================================
   REGISTER
===================================================== */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  try {
    const hashed = await bcrypt.hash(password, 10)

    const result = await pool.query(
      `INSERT INTO "User" (name, email, password_hash)
       VALUES ($1,$2,$3)
       ON CONFLICT (email) DO NOTHING
       RETURNING user_id, name, email`,
      [name, email, hashed]
    )

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Email already exists' })
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('REGISTER ERROR:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* =====================================================
   LOGIN
===================================================== */
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  try {
    const result = await pool.query(
      'SELECT * FROM "User" WHERE email=$1',
      [email]
    )

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    await pool.query(
      'UPDATE "User" SET last_login=NOW() WHERE user_id=$1',
      [user.user_id]
    )

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email
      }
    })
  } catch (err) {
    console.error('LOGIN ERROR:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* =====================================================
   FORGOT PASSWORD  ✅ EMAIL SENT HERE
===================================================== */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body

  try {
    const result = await pool.query(
      'SELECT user_id FROM "User" WHERE email=$1',
      [email]
    )

    // 🔒 Always respond OK (security)
    if (result.rowCount === 0) {
      return res.json({ ok: true })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await pool.query(
      `UPDATE "User"
       SET reset_token=$1, reset_token_expiry=$2
       WHERE email=$3`,
      [resetToken, expiry, email]
    )

    // ✅ CORRECT RESET LINK
    const resetLink =
      `${process.env.FRONTEND_ORIGIN}/reset-password?token=${resetToken}`

    await sendResetEmail(email, resetLink)

    res.json({ ok: true })
  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* =====================================================
   RESET PASSWORD
===================================================== */
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body

  if (!token || !password) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  try {
    const result = await pool.query(
      `SELECT user_id FROM "User"
       WHERE reset_token=$1 AND reset_token_expiry > NOW()`,
      [token]
    )

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Token invalid or expired' })
    }

    const hashed = await bcrypt.hash(password, 10)

    await pool.query(
      `UPDATE "User"
       SET password_hash=$1,
           reset_token=NULL,
           reset_token_expiry=NULL
       WHERE reset_token=$2`,
      [hashed, token]
    )

    res.json({ ok: true })
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
