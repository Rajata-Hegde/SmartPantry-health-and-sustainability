const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { evaluateFoodsForElder } = require('../services/foodSafetyService');

console.log('🔥 foodSafety routes loaded');

/*
  GET /api/food-safety/:elderId
*/
router.get('/:elderId', async (req, res) => {

  const { elderId } = req.params;

  console.log('================ FOOD SAFETY =================');
  console.log('Elder ID:', elderId);
  console.log('User ID from token:', req.user?.user_id);

  try {
    /* 1️⃣ Fetch elder notes */
    const elderRes = await pool.query(
      `SELECT notes FROM elders WHERE id = $1`,
      [elderId]
    );

    console.log('Elder rows:', elderRes.rowCount);

    if (elderRes.rowCount === 0) {
      return res.status(404).json({ error: 'Elder not found' });
    }

    const rawNotes = elderRes.rows[0].notes;
    console.log('Raw notes:', rawNotes);

    let notes = {};
    if (typeof rawNotes === 'string') {
      try {
        notes = JSON.parse(rawNotes);
      } catch {
        notes = {};
      }
    } else if (typeof rawNotes === 'object' && rawNotes !== null) {
      notes = rawNotes;
    }

    const elder = {
      conditions: Array.isArray(notes.conditions) ? notes.conditions : [],
      medicines: Array.isArray(notes.medicines) ? notes.medicines : []
    };

    console.log('Conditions:', elder.conditions);
    console.log('Medicines:', elder.medicines);

    /* 2️⃣ Fetch foods */
    const foodRes = await pool.query(
      `SELECT * FROM elder_food_intake WHERE elder_id=$1`,
      [elderId]
    );

    const foods = foodRes.rows;
    console.log('Food count:', foods.length);

    if (foods.length > 0) {
      console.log('Sample food:', foods[0]);
    }

    /* 3️⃣ No rules → allow all */
    if (elder.conditions.length === 0 && elder.medicines.length === 0) {
      console.log('No conditions/medicines → allow all');
      return res.json({
        blockedFoods: [],
        allowedFoods: foods.map(f => ({ ...f, warnings: [] }))
      });
    }

    /* 4️⃣ Evaluate */
    console.log('Running rule engine...');
    const result = await evaluateFoodsForElder(pool, elder, foods);

    console.log('Blocked:', result.blockedFoods.length);
    console.log('Allowed:', result.allowedFoods.length);

    res.json(result);
  } catch (err) {
    console.error('❌ Food safety error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
