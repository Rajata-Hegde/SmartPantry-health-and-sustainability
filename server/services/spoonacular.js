const axios = require("axios");

exports.getNutrition = async (food) => {
  const res = await axios.get(
    "https://api.spoonacular.com/food/ingredients/search",
    {
      params: {
        query: food,
        apiKey: process.env.SPOONACULAR_API_KEY
      }
    }
  );

  // (simplified)
  return {
    calories: 250,
    protein: 12,
    carbs: 30,
    fat: 10
  };
};
