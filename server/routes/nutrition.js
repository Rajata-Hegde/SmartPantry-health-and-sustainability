const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const { authenticateToken } = require('../middleware/auth')

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY

// Fallback nutrition database for common foods (per 100g or unit)
const NUTRITION_DATABASE = {
  'chicken': { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  'chicken breast': { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  'rice': { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  'white rice': { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  'brown rice': { calories: 111, protein: 2.6, fat: 0.9, carbs: 23 },
  'milk': { calories: 61, protein: 3.2, fat: 3.3, carbs: 4.8, perUnit: 'ml' },
  'egg': { calories: 155, protein: 13, fat: 11, carbs: 1.1, perUnit: 'piece' },
  'bread': { calories: 265, protein: 9, fat: 3.3, carbs: 49, perUnit: 'slice' },
  'banana': { calories: 89, protein: 1.1, fat: 0.3, carbs: 23 },
  'apple': { calories: 52, protein: 0.3, fat: 0.2, carbs: 14 },
  'broccoli': { calories: 34, protein: 2.8, fat: 0.4, carbs: 7 },
  'carrot': { calories: 41, protein: 0.9, fat: 0.2, carbs: 10 },
  'potato': { calories: 77, protein: 2, fat: 0.1, carbs: 17 },
  'fish': { calories: 96, protein: 20, fat: 1.1, carbs: 0 },
  'salmon': { calories: 208, protein: 20, fat: 13, carbs: 0 },
  'beef': { calories: 250, protein: 26, fat: 17, carbs: 0 },
  'yogurt': { calories: 59, protein: 3.5, fat: 0.4, carbs: 3.3 },
  'cheese': { calories: 402, protein: 25, fat: 33, carbs: 1.3 },
  'peanut butter': { calories: 588, protein: 25, fat: 50, carbs: 20 },
  'olive oil': { calories: 884, protein: 0, fat: 100, carbs: 0, perUnit: 'ml' },
  'pasta': { calories: 131, protein: 5, fat: 1.1, carbs: 25 },
  'lentils': { calories: 116, protein: 9, fat: 0.4, carbs: 20 }
}

// POST /api/nutrition/preview - Fetch nutrition data
router.post('/preview', authenticateToken, async (req, res) => {
  const { food_name, quantity, unit } = req.body

  if (!food_name || !quantity || !unit) {
    return res.status(400).json({ error: 'Missing food_name, quantity, or unit' })
  }

  try {
    const normalizedUnit = normalizeUnit(unit)
    const foodKey = food_name.toLowerCase()
    
    console.log('🔍 Looking for food:', foodKey)

    // First, try fallback database
    const foodData = NUTRITION_DATABASE[foodKey]
    
    if (foodData) {
      console.log('✅ Found in fallback database:', foodData)
      const { calories, protein, fat, carbs, perUnit } = foodData
      
      // Calculate based on quantity
      let multiplier = 1
      if (perUnit === 'ml' && normalizedUnit === 'ml') {
        multiplier = quantity / 100
      } else if (perUnit === 'piece' && normalizedUnit === 'piece') {
        multiplier = quantity
      } else if (!perUnit && (normalizedUnit === 'g' || normalizedUnit === 'grams')) {
        multiplier = quantity / 100
      } else {
        multiplier = quantity / 100 // assume per 100g
      }

      return res.json({
        ok: true,
        preview: {
          food_name,
          quantity,
          unit: normalizedUnit,
          calories: Math.round((calories * multiplier) * 100) / 100,
          protein: Math.round((protein * multiplier) * 100) / 100,
          fat: Math.round((fat * multiplier) * 100) / 100,
          carbs: Math.round((carbs * multiplier) * 100) / 100,
          source: 'fallback_database'
        }
      })
    }

    // If not in database, try Spoonacular API
    if (SPOONACULAR_API_KEY && SPOONACULAR_API_KEY !== 'invalid') {
      console.log('📤 Trying Spoonacular API...')
      const ingredientString = `${quantity} ${normalizedUnit} ${food_name}`
      const url = `https://api.spoonacular.com/food/ingredients/parse?ingredientList=${encodeURIComponent(ingredientString)}&apiKey=${SPOONACULAR_API_KEY}`

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      const responseText = await response.text()

      if (response.ok) {
        const data = JSON.parse(responseText)
        if (data && data.length > 0) {
          const ingredient = data[0]
          const nutrition = ingredient.nutrition || {}
          
          return res.json({
            ok: true,
            preview: {
              food_name,
              quantity,
              unit: normalizedUnit,
              calories: Math.round((nutrition.calories || 0) * 100) / 100,
              protein: Math.round((nutrition.protein?.value || 0) * 100) / 100,
              fat: Math.round((nutrition.fat?.value || 0) * 100) / 100,
              carbs: Math.round((nutrition.carbohydrates?.value || 0) * 100) / 100,
              source: 'spoonacular_api'
            }
          })
        }
      }
    }

    // Not found anywhere
    return res.status(404).json({ 
      error: `Food "${food_name}" not found. Try common foods like: chicken, rice, milk, egg, bread, banana, apple, fish, yogurt, pasta` 
    })

  } catch (err) {
    console.error('❌ Preview error:', err.message)
    res.status(500).json({ error: 'Error fetching nutrition data: ' + err.message })
  }
})

// Helper function to normalize units
function normalizeUnit(unit) {
  const unitMap = {
    'grams': 'g',
    'gram': 'g',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'ml': 'ml',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'l': 'l',
    'liter': 'l',
    'liters': 'l',
    'cup': 'cup',
    'cups': 'cup',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'tbsp': 'tbsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'tsp': 'tsp',
    'piece': 'piece',
    'pieces': 'piece',
    'oz': 'oz',
    'ounce': 'oz',
    'ounces': 'oz'
  }
  return unitMap[unit.toLowerCase()] || unit
}

// POST /api/nutrition/save - Save nutrition entry to database
router.post('/save', authenticateToken, async (req, res) => {
  const userId = req.user.user_id
  const { food_name, quantity, unit, calories, protein, fat, carbs, spoonacular_id } = req.body

  if (!food_name || !quantity || !unit) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO nutrition_entries (user_id, food_name, quantity, unit, calories, protein, fat, carbs, spoonacular_id, date_consumed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)
       RETURNING *`,
      [userId, food_name, quantity, unit, calories || 0, protein || 0, fat || 0, carbs || 0, spoonacular_id || null]
    )

    res.json({
      ok: true,
      entry: result.rows[0]
    })
  } catch (err) {
    console.error('POST /api/nutrition/save error', err)
    res.status(500).json({ error: 'Failed to save nutrition entry' })
  }
})

// GET /api/nutrition/daily-summary - Get today's nutrition summary
router.get('/daily-summary', authenticateToken, async (req, res) => {
  const userId = req.user.user_id

  try {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(protein), 0) as total_protein,
        COALESCE(SUM(fat), 0) as total_fat,
        COALESCE(SUM(carbs), 0) as total_carbs,
        COUNT(*) as total_items
       FROM nutrition_entries 
       WHERE user_id=$1 AND date_consumed=CURRENT_DATE`,
      [userId]
    )

    const summary = result.rows[0] || {
      total_calories: 0,
      total_protein: 0,
      total_fat: 0,
      total_carbs: 0,
      total_items: 0
    }

    res.json(summary)
  } catch (err) {
    console.error('GET /api/nutrition/daily-summary error', err)
    res.status(500).json({ error: 'Failed to fetch summary' })
  }
})

// GET /api/nutrition/entries - Get all entries for current user
router.get('/entries', authenticateToken, async (req, res) => {
  const userId = req.user.user_id

  try {
    const result = await pool.query(
      `SELECT * FROM nutrition_entries WHERE user_id=$1 ORDER BY date_consumed DESC, created_at DESC LIMIT 100`,
      [userId]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/nutrition/entries error', err)
    res.status(500).json({ error: 'Failed to fetch entries' })
  }
})

// GET /api/nutrition/daily-entries - Get today's entries
router.get('/daily-entries', authenticateToken, async (req, res) => {
  const userId = req.user.user_id

  try {
    const result = await pool.query(
      `SELECT * FROM nutrition_entries 
       WHERE user_id=$1 AND date_consumed=CURRENT_DATE
       ORDER BY created_at DESC`,
      [userId]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/nutrition/daily-entries error', err)
    res.status(500).json({ error: 'Failed to fetch daily entries' })
  }
})

// PUT /api/nutrition/entries/:id - Update nutrition entry
router.put('/entries/:id', authenticateToken, async (req, res) => {
  const userId = req.user.user_id
  const entryId = req.params.id
  const { quantity, unit } = req.body

  if (!quantity || !unit) {
    return res.status(400).json({ error: 'Missing quantity or unit' })
  }

  try {
    const result = await pool.query(
      `UPDATE nutrition_entries 
       SET quantity=$1, unit=$2
       WHERE id=$3 AND user_id=$4
       RETURNING *`,
      [quantity, unit, entryId, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Entry not found or unauthorized' })
    }

    res.json({ ok: true, entry: result.rows[0] })
  } catch (err) {
    console.error('PUT /api/nutrition/entries/:id error', err)
    res.status(500).json({ error: 'Failed to update entry' })
  }
})

// DELETE /api/nutrition/entries/:id - Delete nutrition entry
router.delete('/entries/:id', authenticateToken, async (req, res) => {
  const userId = req.user.user_id
  const entryId = req.params.id

  try {
    const result = await pool.query(
      `DELETE FROM nutrition_entries WHERE id=$1 AND user_id=$2`,
      [entryId, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Entry not found or unauthorized' })
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/nutrition/entries/:id error', err)
    res.status(500).json({ error: 'Failed to delete entry' })
  }
})

// GET /api/nutrition/stats/:date - Get nutrition stats for a specific date
router.get('/stats/:date', authenticateToken, async (req, res) => {
  const userId = req.user.user_id
  const targetDate = req.params.date

  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(protein), 0) as total_protein,
        COALESCE(SUM(carbs), 0) as total_carbs,
        COALESCE(SUM(fat), 0) as total_fat
       FROM nutrition_entries
       WHERE user_id=$1 AND DATE(date_consumed)=DATE($2)`,
      [userId, targetDate]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error('GET /api/nutrition/stats/:date error', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// GET /api/nutrition/recommendations - Get personalized recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
  const userId = req.user.user_id

  try {
    // Get last 7 days of data
    const result = await pool.query(
      `SELECT 
        AVG(daily_calories) as avg_calories,
        AVG(daily_protein) as avg_protein,
        AVG(daily_carbs) as avg_carbs,
        AVG(daily_fat) as avg_fat
       FROM (
         SELECT 
           DATE(date_consumed) as day,
           SUM(calories) as daily_calories,
           SUM(protein) as daily_protein,
           SUM(carbs) as daily_carbs,
           SUM(fat) as daily_fat
         FROM nutrition_entries
         WHERE user_id=$1 AND date_consumed >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(date_consumed)
       ) daily_stats`,
      [userId]
    )

    const stats = result.rows[0]
    const recommendations = []

    if (stats.avg_calories) {
      const avgCalories = parseFloat(stats.avg_calories)
      const avgProtein = parseFloat(stats.avg_protein)
      const avgCarbs = parseFloat(stats.avg_carbs)
      const avgFat = parseFloat(stats.avg_fat)

      // Calorie recommendations
      if (avgCalories < 1500) {
        recommendations.push({
          type: 'warning',
          message: 'Your average calorie intake is quite low. Consider increasing portion sizes or adding healthy snacks.',
          priority: 'high'
        })
      } else if (avgCalories > 3000) {
        recommendations.push({
          type: 'warning',
          message: 'Your calorie intake is higher than recommended. Try smaller portions or choosing lower-calorie options.',
          priority: 'high'
        })
      }

      // Protein recommendations
      const proteinPercent = (avgProtein * 4 / avgCalories) * 100
      if (proteinPercent < 15) {
        recommendations.push({
          type: 'tip',
          message: 'Increase your protein intake. Add lean meats, fish, eggs, or legumes to your meals.',
          priority: 'medium'
        })
      } else if (proteinPercent > 30) {
        recommendations.push({
          type: 'tip',
          message: 'Your protein intake is high. Balance it with more vegetables and whole grains.',
          priority: 'low'
        })
      }

      // Carbs recommendations
      const carbsPercent = (avgCarbs * 4 / avgCalories) * 100
      if (carbsPercent < 40) {
        recommendations.push({
          type: 'tip',
          message: 'Consider adding more complex carbohydrates like whole grains, fruits, and vegetables.',
          priority: 'medium'
        })
      } else if (carbsPercent > 65) {
        recommendations.push({
          type: 'warning',
          message: 'Your carbohydrate intake is high. Try incorporating more protein and healthy fats.',
          priority: 'medium'
        })
      }

      // Fat recommendations
      const fatPercent = (avgFat * 9 / avgCalories) * 100
      if (fatPercent < 20) {
        recommendations.push({
          type: 'tip',
          message: 'Add healthy fats like avocados, nuts, olive oil, and fatty fish to your diet.',
          priority: 'medium'
        })
      } else if (fatPercent > 40) {
        recommendations.push({
          type: 'warning',
          message: 'Your fat intake is quite high. Focus on healthier fat sources and reduce fried foods.',
          priority: 'medium'
        })
      }

      // Balance recommendation
      if (recommendations.length === 0) {
        recommendations.push({
          type: 'success',
          message: 'Great job! Your nutrition is well-balanced. Keep up the good work!',
          priority: 'low'
        })
      }
    } else {
      recommendations.push({
        type: 'info',
        message: 'Start logging your meals to get personalized recommendations!',
        priority: 'low'
      })
    }

    res.json({ recommendations })
  } catch (err) {
    console.error('GET /api/nutrition/recommendations error', err)
    res.status(500).json({ error: 'Failed to fetch recommendations' })
  }
})

// POST /api/nutrition/ai-analysis - Get AI-powered nutrition analysis
router.post('/ai-analysis', authenticateToken, async (req, res) => {
  const userId = req.user.user_id
  const { period } = req.body // 'today', '1day', '3days', '7days', '30days', or custom { start, end }

  try {
    let startDate, endDate = new Date()
    
    if (period === 'today') {
      startDate = new Date()
      startDate.setHours(0, 0, 0, 0)
    } else if (period === '1day') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 1)
    } else if (period === '3days') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 3)
    } else if (period === '7days') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
    } else if (period === '30days') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
    } else if (period.start && period.end) {
      startDate = new Date(period.start)
      endDate = new Date(period.end)
    } else {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
    }

    // Get nutrition data for the period
    const result = await pool.query(
      `SELECT 
        food_name, quantity, unit, calories, protein, carbs, fat, date_consumed
       FROM nutrition_entries
       WHERE user_id=$1 AND date_consumed >= $2 AND date_consumed <= $3
       ORDER BY date_consumed DESC`,
      [userId, startDate, endDate]
    )

    const entries = result.rows

    // Calculate stats
    const stats = {
      total_entries: entries.length,
      total_calories: entries.reduce((sum, e) => sum + parseFloat(e.calories), 0),
      total_protein: entries.reduce((sum, e) => sum + parseFloat(e.protein), 0),
      total_carbs: entries.reduce((sum, e) => sum + parseFloat(e.carbs), 0),
      total_fat: entries.reduce((sum, e) => sum + parseFloat(e.fat), 0)
    }

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1
    stats.avg_daily_calories = Math.round(stats.total_calories / days)

    // Prepare data for AI analysis
    const foodList = entries.map(e => `${e.food_name} (${e.quantity} ${e.unit})`).join(', ')
    
    // Call Groq API for AI analysis
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    console.log('🔑 GROQ_API_KEY loaded:', GROQ_API_KEY ? 'YES' : 'NO')
    
    let analysis = ''
    
    if (GROQ_API_KEY && GROQ_API_KEY !== 'invalid') {
      const prompt = `You are a professional nutritionist analyzing someone's eating patterns over ${days} days. 

Here are their nutrition stats:
- Total Entries: ${stats.total_entries}
- Total Calories: ${Math.round(stats.total_calories)}
- Average Daily Calories: ${stats.avg_daily_calories}
- Total Protein: ${Math.round(stats.total_protein)}g
- Total Carbs: ${Math.round(stats.total_carbs)}g
- Total Fat: ${Math.round(stats.total_fat)}g

Foods consumed: ${foodList}

Provide a comprehensive nutrition analysis including:
1. Overall assessment of their diet
2. Strengths in their eating habits
3. Areas for improvement
4. Specific actionable recommendations (3-5 suggestions)
5. Potential health concerns based on the data

Keep the response professional, encouraging, and actionable. Format as clear paragraphs.`

      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
          })
        })

        if (groqResponse.ok) {
          const groqData = await groqResponse.json()
          analysis = groqData.choices[0].message.content
          console.log('✅ AI Analysis generated successfully')
        } else {
          const errorText = await groqResponse.text()
          console.error('❌ GROQ API Error:', groqResponse.status, errorText)
        }
      } catch (apiErr) {
        console.error('❌ GROQ API Exception:', apiErr.message)
      }
    }
    
    // Generate rule-based analysis if AI fails
    if (!analysis) {
      console.log('📝 Using rule-based analysis')
      const avgCalories = stats.avg_daily_calories
      const proteinPercent = (stats.total_protein * 4 / stats.total_calories) * 100
      const carbsPercent = (stats.total_carbs * 4 / stats.total_calories) * 100
      const fatPercent = (stats.total_fat * 9 / stats.total_calories) * 100
      
      analysis = `OVERALL ASSESSMENT\n\n`
      
      if (stats.total_entries < 3) {
        analysis += `You've logged ${stats.total_entries} ${stats.total_entries === 1 ? 'entry' : 'entries'} over ${days} ${days === 1 ? 'day' : 'days'}. Great start! Consistent tracking will help you better understand your nutrition patterns.\n\n`
      } else {
        analysis += `You've logged ${stats.total_entries} entries over ${days} ${days === 1 ? 'day' : 'days'}. Your average daily intake is ${avgCalories} calories, with ${Math.round(stats.total_protein / days)}g protein, ${Math.round(stats.total_carbs / days)}g carbs, and ${Math.round(stats.total_fat / days)}g fat per day.\n\n`
      }
      
      analysis += `MACRONUTRIENT BREAKDOWN\n\n`
      analysis += `Protein: ${proteinPercent.toFixed(1)}% (Target: 15-30%)\n`
      analysis += `Carbohydrates: ${carbsPercent.toFixed(1)}% (Target: 45-65%)\n`
      analysis += `Fat: ${fatPercent.toFixed(1)}% (Target: 20-35%)\n\n`
      
      analysis += `PERSONALIZED RECOMMENDATIONS\n\n`
      
      let mealSuggestions = []
      
      if (avgCalories < 1200) {
        analysis += `Your calorie intake appears low. Ensure you're meeting your body's energy needs with nutrient-dense foods.\n\n`
        mealSuggestions.push(
          `Breakfast: Scrambled eggs (2 eggs) with avocado toast and a banana (450 cal)`,
          `Lunch: Grilled chicken salad with quinoa, mixed vegetables, and olive oil dressing (550 cal)`,
          `Snack: Greek yogurt with honey and almonds (250 cal)`,
          `Dinner: Salmon fillet with sweet potato and steamed broccoli (600 cal)`
        )
      } else if (avgCalories > 3000) {
        analysis += `Your calorie intake is quite high. Consider portion control and choosing lower-calorie nutrient-dense options.\n\n`
        mealSuggestions.push(
          `Breakfast: Oatmeal with berries and a handful of walnuts (350 cal)`,
          `Lunch: Grilled fish with brown rice and steamed vegetables (500 cal)`,
          `Snack: Apple slices with almond butter (200 cal)`,
          `Dinner: Lean turkey breast with roasted vegetables and quinoa (550 cal)`
        )
      } else {
        analysis += `Your calorie intake looks reasonable. Focus on maintaining consistency and food quality.\n\n`
      }
      
      if (proteinPercent < 15) {
        analysis += `You need more protein for muscle maintenance and satiety. Aim for 20-30g protein per meal.\n\n`
        mealSuggestions.push(
          `Protein-rich breakfast: Greek yogurt parfait with granola and berries`,
          `Protein-packed lunch: Grilled chicken breast with lentil soup`,
          `Protein snack: Hard-boiled eggs or protein shake`,
          `High-protein dinner: Baked salmon with chickpea salad`
        )
      } else if (proteinPercent > 30) {
        analysis += `Your protein intake is high. Balance it with more vegetables and whole grains for fiber and micronutrients.\n\n`
        mealSuggestions.push(
          `Balanced breakfast: Whole grain toast with peanut butter and banana`,
          `Veggie-rich lunch: Buddha bowl with quinoa, roasted vegetables, and tofu`,
          `Fiber snack: Fresh fruit salad with a sprinkle of chia seeds`,
          `Plant-forward dinner: Vegetable stir-fry with brown rice and small portion of chicken`
        )
      }
      
      if (carbsPercent < 40) {
        analysis += `Add more complex carbohydrates for sustained energy. Include whole grains, fruits, and starchy vegetables.\n\n`
        mealSuggestions.push(
          `Energy breakfast: Overnight oats with banana and berries`,
          `Carb-balanced lunch: Whole wheat pasta with marinara sauce and grilled vegetables`,
          `Healthy snack: Whole grain crackers with hummus`,
          `Dinner: Brown rice bowl with beans, corn, and grilled vegetables`
        )
      } else if (carbsPercent > 65) {
        analysis += `Your carb intake is high. Balance with more protein and healthy fats for stable blood sugar.\n\n`
        mealSuggestions.push(
          `Balanced breakfast: Vegetable omelet with a small side of whole grain toast`,
          `Protein-rich lunch: Grilled fish with mixed green salad and avocado`,
          `Low-carb snack: Handful of nuts or cheese with cherry tomatoes`,
          `Dinner: Grilled chicken with cauliflower rice and sautéed spinach`
        )
      }
      
      if (fatPercent < 20) {
        analysis += `Include more healthy fats for hormone production and nutrient absorption. Add avocados, nuts, olive oil, and fatty fish.\n\n`
        mealSuggestions.push(
          `Healthy fat breakfast: Avocado toast with poached eggs`,
          `Omega-3 lunch: Salmon salad with olive oil dressing and walnuts`,
          `Fat-rich snack: Trail mix with almonds, cashews, and dried fruit`,
          `Dinner: Mackerel with roasted vegetables drizzled with olive oil`
        )
      } else if (fatPercent > 35) {
        analysis += `Your fat intake is quite high. Focus on healthier fat sources and reduce fried foods and excessive oils.\n\n`
        mealSuggestions.push(
          `Light breakfast: Fruit smoothie with low-fat yogurt and spinach`,
          `Lean lunch: Grilled turkey breast with steamed vegetables`,
          `Low-fat snack: Fresh fruit or air-popped popcorn`,
          `Dinner: Baked cod with quinoa and roasted Brussels sprouts`
        )
      }
      
      if (mealSuggestions.length > 0) {
        analysis += `SUGGESTED MEAL IDEAS\n\n`
        mealSuggestions.slice(0, 4).forEach((meal, i) => {
          analysis += `${i + 1}. ${meal}\n`
        })
        analysis += `\n`
      }
      
      analysis += `Remember: Stay hydrated with 8-10 glasses of water daily, eat mindfully, and maintain consistent meal times. Small, sustainable changes lead to lasting results!`
    }

    res.json({ stats, analysis, period: { start: startDate, end: endDate } })
  } catch (err) {
    console.error('POST /api/nutrition/ai-analysis error', err)
    res.status(500).json({ error: 'Failed to generate AI analysis' })
  }
})

// GET /api/nutrition/quick-tip - Get AI-generated quick nutrition tip
router.get('/quick-tip', authenticateToken, async (req, res) => {
  const userId = req.user.user_id

  try {
    // Get last 3 days of data for personalized tips
    const result = await pool.query(
      `SELECT item_name, calories, protein, carbs, fat
       FROM nutrition_entries
       WHERE user_id=$1 AND date_consumed >= NOW() - INTERVAL '3 days'
       ORDER BY date_consumed DESC
       LIMIT 20`,
      [userId]
    )

    const recentFoods = result.rows

    let tip = ''
    let badge = 'general'

    const GROQ_API_KEY = process.env.GROQ_API_KEY

    if (recentFoods.length > 0 && GROQ_API_KEY) {
      const foodList = recentFoods.map(f => f.food_name).join(', ')
      
      const prompt = `Based on someone recently eating: ${foodList}

Generate ONE short, actionable nutrition tip (maximum 20 words) that's specific to their recent food choices. Be encouraging and practical.`

      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 50
          })
        })

        if (groqResponse.ok) {
          const groqData = await groqResponse.json()
          tip = groqData.choices[0].message.content.trim().replace(/^["']|["']$/g, '')
          badge = 'personalized'
        }
      } catch (aiErr) {
        console.log('AI tip generation failed, using fallback')
      }
    }

    // Fallback tips if AI fails or no data
    if (!tip) {
      const fallbackTips = [
        'Drink a glass of water before each meal to aid digestion.',
        'Add a serving of vegetables to your next meal.',
        'Choose whole grain options when possible.',
        'Protein at breakfast helps maintain energy throughout the day.',
        'Colorful plates mean diverse nutrients!',
        'Healthy snacks prevent overeating at main meals.',
        'Meal prep on weekends saves time and improves diet quality.',
        'Mindful eating enhances satisfaction and reduces overeating.'
      ]
      tip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)]
      badge = recentFoods.length > 0 ? 'general' : 'fallback'
    }

    res.json({ tip, badge })
  } catch (err) {
    console.error('GET /api/nutrition/quick-tip error', err)
    res.json({
      tip: 'Stay hydrated and eat a balanced diet with plenty of fruits and vegetables.',
      badge: 'fallback'
    })
  }
})

module.exports = router