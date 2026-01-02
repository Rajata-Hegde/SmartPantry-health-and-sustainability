require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { pool } = require('./db')
const authRoutes = require('./routes/auth')
const elderRoutes = require('./routes/elders')
const receiptRoutes = require('./routes/receipts')
const pantryRoutes = require('./routes/pantry')
const nutritionRoutes = require('./routes/nutrition')

const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }))

// ensure table
const userTableDDL = `
CREATE TABLE IF NOT EXISTS "User" (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP
);
`

;(async () => {
  try {
    await pool.query(userTableDDL)
    console.log('Ensured User table exists')
  } catch (err) {
    console.error('Failed to create User table', err)
  }
})()

// Ensure receipts + receipt_items tables and optional user_id FK
const receiptsDDL = `
CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  store_name VARCHAR(255),
  bill_number VARCHAR(50),
  receipt_date DATE,
  total_amount NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipt_items (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
  item_name VARCHAR(255),
  quantity NUMERIC(10,2),
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2)
);

-- add user_id FK to receipts if "User" table exists; allow nullable user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'receipts' AND kcu.column_name = 'user_id'
  ) THEN
    BEGIN
      ALTER TABLE receipts DROP CONSTRAINT IF EXISTS fk_receipts_user;
    EXCEPTION WHEN undefined_table THEN
      -- ignore
    END;
    -- only add constraint if "User" table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='User' OR table_name='user') THEN
      ALTER TABLE receipts ADD CONSTRAINT fk_receipts_user FOREIGN KEY (user_id) REFERENCES "User"(user_id);
    END IF;
  END IF;
END$$;
`

;(async () => {
  try {
    await pool.query(receiptsDDL)
    console.log('Ensured receipts and receipt_items tables exist')
  } catch (err) {
    console.error('Failed to create receipts tables', err)
  }
})()

app.use('/api', authRoutes)
app.use('/api/elders', elderRoutes)
app.use('/api/receipts', receiptRoutes)
app.use('/api/pantry', pantryRoutes)
app.use('/api/nutrition', nutritionRoutes)
app.use('/api/recipes', require('./routes/recipes'))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

