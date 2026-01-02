const express = require('express')
const fetch = require('node-fetch')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// 🔐 Protect all recipe routes
router.use(authenticateToken)

/* =====================================================
   POST /api/recipes/from-pantry
   → Generate recipes from selected pantry items
===================================================== */
router.post('/from-pantry', async (req, res) => {
  console.log('🔥 /from-pantry HIT')
  console.log('BODY:', req.body)

  const { ingredients } = req.body
  const apiKey = process.env.SPOONACULAR_API_KEY   // ✅ MATCHED NAME

  console.log('API KEY EXISTS:', !!apiKey)

  if (!apiKey) {
    return res.status(500).json({ error: 'Spoonacular API key missing' })
  }

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'No ingredients provided' })
  }

  try {
    // ✅ Clean pantry ingredient names
    const cleanedIngredients = ingredients
      .map(i =>
        i
          .toLowerCase()
          .replace(/[^a-z\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(Boolean)

    console.log('CLEANED INGREDIENTS:', cleanedIngredients)

    if (cleanedIngredients.length === 0) {
      return res.status(400).json({ error: 'Invalid ingredients after cleaning' })
    }

    const ingredientString = cleanedIngredients.join(',')

    const url =
      `https://api.spoonacular.com/recipes/findByIngredients` +
      `?ingredients=${encodeURIComponent(ingredientString)}` +
      `&number=10` +
      `&ranking=1` +
      `&ignorePantry=true` +
      `&apiKey=${apiKey}`

    console.log('SPOONACULAR URL:', url)

    const response = await fetch(url)
    console.log('SPOONACULAR STATUS:', response.status)

    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('POST /from-pantry ERROR:', err)
    res.status(500).json({ error: 'Failed to fetch recipes' })
  }
})

/* =====================================================
   GET /api/recipes/:id
   → Full recipe details
===================================================== */
router.get('/:id', async (req, res) => {
  console.log('🔥 /recipes/:id HIT', req.params.id)

  const apiKey = process.env.SPOONACULAR_API_KEY   // ✅ MATCHED NAME

  if (!apiKey) {
    return res.status(500).json({ error: 'Spoonacular API key missing' })
  }

  try {
    const infoUrl =
      `https://api.spoonacular.com/recipes/${req.params.id}/information?apiKey=${apiKey}`

    const stepsUrl =
      `https://api.spoonacular.com/recipes/${req.params.id}/analyzedInstructions?apiKey=${apiKey}`

    const infoRes = await fetch(infoUrl)
    const stepsRes = await fetch(stepsUrl)

    const info = await infoRes.json()
    const stepsData = await stepsRes.json()

    res.json({
      id: req.params.id,
      title: info.title,
      image: info.image,
      readyInMinutes: info.readyInMinutes,
      servings: info.servings,
      ingredients: info.extendedIngredients?.map(i => i.original) || [],
      steps: stepsData[0]?.steps || []
    })
  } catch (err) {
    console.error('GET /:id ERROR:', err)
    res.status(500).json({ error: 'Failed to load recipe details' })
  }
})

module.exports = router
