const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// 🔐 Protect all elder routes
router.use(authenticateToken);

/* ============================
   Helpers
============================ */
function safeJSON(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

/* ============================
   GET /api/elders
   → List elders for logged-in user
============================ */
router.get('/', async (req, res) => {
  const userId = req.user.user_id;

  try {
    const q = await pool.query(
      `
      SELECT id, user_id, name, gender, notes, created_at, updated_at
      FROM elders
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    const elders = q.rows.map(row => {
      const notes = safeJSON(row.notes, {});

      return {
        id: row.id,
        name: row.name,
        gender: row.gender,
        age: notes.age ?? null,
        height: notes.height_cm ?? null,
        weight: notes.weight_kg ?? null,
        conditions: Array.isArray(notes.conditions) ? notes.conditions : [],
        allergies: notes.allergies || '',
        meds: Array.isArray(notes.medicines) ? notes.medicines : [],
        diet: notes.diet || '',
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    res.json(elders);
  } catch (err) {
    console.error('GET /api/elders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ============================
   GET /api/elders/:id
============================ */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  if (isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid elder id' });
  }

  try {
    const q = await pool.query(
      `
      SELECT id, user_id, name, gender, notes, created_at, updated_at
      FROM elders
      WHERE id = $1 AND user_id = $2
      `,
      [id, userId]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ error: 'Elder not found' });
    }

    const row = q.rows[0];
    const notes = safeJSON(row.notes, {});

    res.json({
      id: row.id,
      name: row.name,
      gender: row.gender,
      age: notes.age ?? null,
      height: notes.height_cm ?? null,
      weight: notes.weight_kg ?? null,
      conditions: Array.isArray(notes.conditions) ? notes.conditions : [],
      allergies: notes.allergies || '',
      meds: Array.isArray(notes.medicines) ? notes.medicines : [],
      diet: notes.diet || '',
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  } catch (err) {
    console.error('GET /api/elders/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ============================
   POST /api/elders
   → Create new elder
============================ */
router.post('/', async (req, res) => {
  const userId = req.user.user_id;
  const {
    name,
    age,
    gender,
    height,
    weight,
    conditions,
    allergies,
    meds,
    diet
  } = req.body;

  if (!name || !age) {
    return res.status(400).json({ error: 'Name and age are required' });
  }

  try {
    const notes = {
      age: Number(age),
      height_cm: height || null,
      weight_kg: weight || null,
      conditions: Array.isArray(conditions) ? conditions : [],
      allergies: allergies || '',
      medicines: Array.isArray(meds) ? meds : [],
      diet: diet || ''
    };

    const q = await pool.query(
      `
      INSERT INTO elders (user_id, name, gender, notes, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
      `,
      [userId, name, gender || null, JSON.stringify(notes)]
    );

    res.status(201).json({
      ok: true,
      elder: {
        id: q.rows[0].id,
        name,
        gender,
        ...notes
      }
    });
  } catch (err) {
    console.error('POST /api/elders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ============================
   PUT /api/elders/:id
============================ */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;
  const {
    name,
    age,
    gender,
    height,
    weight,
    conditions,
    allergies,
    meds,
    diet
  } = req.body;

  if (!name || !age) {
    return res.status(400).json({ error: 'Name and age are required' });
  }

  try {
    const notes = {
      age: Number(age),
      height_cm: height || null,
      weight_kg: weight || null,
      conditions: Array.isArray(conditions) ? conditions : [],
      allergies: allergies || '',
      medicines: Array.isArray(meds) ? meds : [],
      diet: diet || ''
    };

    const q = await pool.query(
      `
      UPDATE elders
      SET name = $1,
          gender = $2,
          notes = $3,
          updated_at = NOW()
      WHERE id = $4 AND user_id = $5
      RETURNING id
      `,
      [name, gender || null, JSON.stringify(notes), id, userId]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ error: 'Not found or unauthorized' });
    }

    res.json({
      ok: true,
      elder: {
        id,
        name,
        gender,
        ...notes
      }
    });
  } catch (err) {
    console.error('PUT /api/elders/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ============================
   DELETE /api/elders/:id
============================ */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `
      DELETE FROM elders
      WHERE id = $1 AND user_id = $2
      `,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not found or unauthorized' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/elders/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
