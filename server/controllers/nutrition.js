const spoonacular = require("../services/spoonacular.service");
const aiService = require("../services/ai.service");
const gradingService = require("../services/grading.service");
const Nutrition = require("../models/nutrition.model");

exports.addNutritionEntry = async (req, res) => {
  try {
    const { foodName } = req.body;
    const userId = req.user.id;

    // 1️⃣ Spoonacular API
    const nutrition = await spoonacular.getNutrition(foodName);

    // 2️⃣ Real-time grade
    const grade = gradingService.calculate(nutrition);

    // 3️⃣ Save to DB
    await Nutrition.create({
      user_id: userId,
      food_name: foodName,
      ...nutrition,
      grade
    });

    // 4️⃣ AI Coaching
    const insights = await aiService.getCoaching(userId);

    res.json({
      success: true,
      grade,
      nutrition,
      insights
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
