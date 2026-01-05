
const express = require('express');
const {
  addFood,
  getFoodsByElder
} = require('../controllers/elderFoodController');

const { pool } = require('../db');

// NOTE: This file is mounted before the protected `elders` routes.
// For development only we expose a public GET /api/elders that
// returns the elders for `user_id = 1`. Remove before production.

const router = express.Router();

// POST /api/elders/:elderId/food
router.post('/:elderId/food', addFood);

// GET /api/elders/:elderId/food
router.get('/:elderId/food', getFoodsByElder);

// DEV: Public list of elders for debugging (user_id = 1)
router.get('/', async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT id, user_id, name, gender, notes, created_at, updated_at
      FROM elders
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [1]);

    const safeJSON = (v, fallback = {}) => {
      if (!v) return fallback;
      if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return fallback; }
      }
      return v;
    };

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
    console.error('DEV GET /api/elders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

