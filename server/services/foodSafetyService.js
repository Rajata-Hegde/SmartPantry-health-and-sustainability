// 🔁 Rule nutrient → food table column mapping
const NUTRIENT_MAP = {
  // sugars
  added_sugar_g: 'sugar_g',
  sugar_g: 'sugar_g',
  fructose_g: 'sugar_g',

  // fats
  saturated_fat_g: 'fat_g',
  trans_fat_g: 'fat_g',
  fat_g: 'fat_g',

  // carbs
  total_carbohydrate_g: 'carbs_g', // if you don't have carbs, skip rules
  carbohydrate_g: 'carbs_g',

  // fiber
  fiber_g: 'fiber_g',

  // sodium / potassium
  sodium_mg: 'sodium_mg',
  potassium_mg: 'potassium_mg',

  // protein
  protein_g: 'protein_g',

  // vitamins
  vitamin_k_mg: 'vitamin_k_mcg',
  vitamin_k_mcg: 'vitamin_k_mcg'
};


async function evaluateFoodsForElder(pool, elder, foods) {
  const blockedFoods = [];
  const allowedFoods = [];

  /* ============================
     Fetch CONDITION rules
  ============================ */
  const conditionRulesRes = await pool.query(
    `
    SELECT condition, nutrient, max_daily_value, severity
    FROM medical_nutrient_rules
    WHERE condition = ANY($1)
    `,
    [elder.conditions]
  );

  const conditionRules = conditionRulesRes.rows;

  /* ============================
     Fetch MEDICINE interactions
  ============================ */
  const medicineRulesRes = await pool.query(
    `
    SELECT medicine, affected_item, severity, recommendation
    FROM medicine_food_interactions
    WHERE medicine = ANY($1)
    `,
    [elder.medicines]
  );

  const medicineRules = medicineRulesRes.rows;

  /* ============================
     Evaluate each food
  ============================ */
  for (const food of foods) {
    let blocked = false;
    let blockReason = "";
    const warnings = [];

    /* ---- CONDITION CHECK (STRICT) ---- */
    for (const rule of conditionRules) {
      const mappedColumn = NUTRIENT_MAP[rule.nutrient];

if (!mappedColumn) continue;           // rule not supported by food data
const value = food[mappedColumn];

if (value === undefined || value === null) continue;


      if (value !== undefined && value > rule.max_daily_value) {
        blocked = true;
        blockReason = `${rule.condition}: ${rule.nutrient} exceeds limit`;
        break;
      }
    }

    if (blocked) {
      blockedFoods.push({
        food: food.food_name,
        reason: blockReason
      });
      continue;
    }

    /* ---- MEDICINE CHECK (WARNING / BLOCK) ---- */
    for (const rule of medicineRules) {
      const value = food[rule.affected_item];

      if (value !== undefined) {
        if (rule.severity === "HIGH") {
          blocked = true;
          blockReason = `${rule.medicine}: interaction risk`;
          break;
        } else {
          warnings.push(rule.recommendation || "Possible interaction");
        }
      }
    }

    if (blocked) {
      blockedFoods.push({
        food: food.food_name,
        reason: blockReason
      });
    } else {
      allowedFoods.push({
        ...food,
        warnings
      });
    }
  }

  return { blockedFoods, allowedFoods };
}

module.exports = { evaluateFoodsForElder };
