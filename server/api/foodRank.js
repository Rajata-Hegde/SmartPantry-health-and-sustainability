const axios = require('axios');
const { pool } = require('../db');

const rankFoods = async (req, res) => {
  try {
    const { elder_id } = req.params;

    // 1️⃣ Get elder info
    const elderRes = await pool.query(
      "SELECT age, bmi, conditions, medicines FROM elders WHERE id=$1",
      [elder_id]
    );
    const elder = elderRes.rows[0];

    // 2️⃣ Get SAFE foods (already filtered)
    const foodRes = await pool.query(
      `SELECT food_name, calories, sugar_g, fat_g, sodium_mg,
              fiber_g, protein_g, potassium_mg
       FROM elder_food_intake
       WHERE elder_id=$1`,
      [elder_id]
    );

    // 3️⃣ Build ML rows
    const mlRows = foodRes.rows.map(f => ({
      age: elder.age,
      bmi: elder.bmi,

      diabetes: elder.conditions.includes("Diabetes") ? 1 : 0,
      hypertension: elder.conditions.includes("Hypertension") ? 1 : 0,
      cardiac: elder.conditions.includes("Cardiac Disease") ? 1 : 0,
      kidney: elder.conditions.includes("Kidney Disease") ? 1 : 0,

      metformin: elder.medicines.includes("Metformin") ? 1 : 0,
      insulin: elder.medicines.includes("Insulin") ? 1 : 0,
      warfarin: elder.medicines.includes("Warfarin") ? 1 : 0,
      statins: elder.medicines.includes("Statins") ? 1 : 0,

      calories: f.calories,
      sugar_g: f.sugar_g,
      fat_g: f.fat_g,
      sodium_mg: f.sodium_mg,
      fiber_g: f.fiber_g,
      protein_g: f.protein_g,
      potassium_mg: f.potassium_mg,

      warnings_count: 0
    }));

    // 4️⃣ Call ML API (mlapi.py)
    const mlRes = await axios.post("http://localhost:8000/predict", mlRows);

    // 5️⃣ Attach scores + rank
    const rankedFoods = foodRes.rows
      .map((food, i) => ({
        ...food,
        risk_score: mlRes.data.predictions ? mlRes.data.predictions[i] : null
      }))
      .sort((a, b) => (a.risk_score ?? 0) - (b.risk_score ?? 0))
      .map((f, i) => ({ ...f, rank: i + 1 }));

    res.json({ ranked_foods: rankedFoods });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { rankFoods };
