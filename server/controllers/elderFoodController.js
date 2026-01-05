const axios = require("axios");
const { pool } = require("../db");

// -----------------------------
// ADD FOOD FOR ELDER
// -----------------------------
async function addFood(req, res) {
  const elderId = parseInt(req.params.elderId, 10);
  const { foodName } = req.body;

  if (!elderId || !foodName) {
    return res.status(400).json({
      error: "elderId and foodName are required"
    });
  }

  console.log("👉 ADD FOOD HIT");
  console.log("elderId:", elderId);
  console.log("foodName:", foodName);

  try {
    // 1️⃣ SEARCH INGREDIENT
    const search = await axios.get(
      "https://api.spoonacular.com/food/ingredients/search",
      {
        params: {
          query: foodName,
          number: 1,
          apiKey: process.env.SPOONACULAR_KEY
        }
      }
    );

    if (!search.data.results?.length) {
      return res.status(404).json({ error: "Food not found" });
    }

    const ingredientId = search.data.results[0].id;

    // 2️⃣ FETCH NUTRITION
    const info = await axios.get(
      `https://api.spoonacular.com/food/ingredients/${ingredientId}/information`,
      {
        params: {
          apiKey: process.env.SPOONACULAR_KEY,
          amount: 1,
          unit: "serving"
        }
      }
    );

    const nutrients = info.data?.nutrition?.nutrients || [];
    const get = (name) =>
      nutrients.find(n => n.name === name)?.amount ?? 0;

    // 3️⃣ INSERT INTO DB
    const result = await pool.query(
      `
      INSERT INTO elder_food_intake
      (
        elder_id, food_name, calories, sugar_g, sodium_mg,
        fat_g, protein_g, fiber_g, potassium_mg, vitamin_k_mcg, source
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        elderId,
        foodName,
        get("Calories"),
        get("Sugar"),
        get("Sodium"),
        get("Fat"),
        get("Protein"),
        get("Fiber"),
        get("Potassium"),
        get("Vitamin K"), // Spoonacular already gives mcg
        "Spoonacular"
      ]
    );

    console.log("✅ FOOD INSERTED:", result.rows[0]);
    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("🔥 ADD FOOD ERROR:", err.message);
    res.status(500).json({ error: "Failed to add food" });
  }
}

// -----------------------------
// GET FOODS FOR ELDER
// -----------------------------
async function getFoodsByElder(req, res) {
  const elderId = parseInt(req.params.elderId, 10);

  if (!elderId) {
    return res.status(400).json({ error: "Invalid elderId" });
  }

  try {
    const result = await pool.query(
      `
      SELECT *
      FROM elder_food_intake
      WHERE elder_id = $1
      ORDER BY created_at DESC
      `,
      [elderId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("🔥 FETCH FOODS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch foods" });
  }
}

module.exports = { addFood, getFoodsByElder };
