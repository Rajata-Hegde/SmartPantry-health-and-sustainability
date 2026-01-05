function buildMLFeatures(elderNotes, food) {
  return {
    age: elderNotes.age || 60,
    bmi: elderNotes.bmi || 24,

    diabetes: elderNotes.conditions?.includes("Diabetes") ? 1 : 0,
    hypertension: elderNotes.conditions?.includes("Hypertension") ? 1 : 0,
    cardiac: elderNotes.conditions?.includes("Cardiac Disease") ? 1 : 0,
    kidney: elderNotes.conditions?.includes("Kidney Disease") ? 1 : 0,

    metformin: elderNotes.medicines?.includes("Metformin") ? 1 : 0,
    insulin: elderNotes.medicines?.includes("Insulin") ? 1 : 0,
    statins: elderNotes.medicines?.includes("Statins") ? 1 : 0,
    warfarin: elderNotes.medicines?.includes("Warfarin") ? 1 : 0,

    calories: food.calories || 0,
    sugar_g: food.sugar_g || 0,
    fat_g: food.fat_g || 0,
    protein_g: food.protein_g || 0,
    fiber_g: food.fiber_g || 0,
    sodium_mg: food.sodium_mg || 0,
    potassium_mg: food.potassium_mg || 0,

    warnings_count: food.warnings?.length || 0
  };
}

module.exports = { buildMLFeatures };
