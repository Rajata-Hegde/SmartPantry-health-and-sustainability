BEGIN;

-- Drop child tables first to avoid FK errors
DROP TABLE IF EXISTS receipt_items CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS nutrition_entries CASCADE;
DROP TABLE IF EXISTS pantry_items CASCADE;
DROP TABLE IF EXISTS daily_summary CASCADE;
DROP TABLE IF EXISTS ingredient_cache CASCADE;
DROP TABLE IF EXISTS elders CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;   -- drop quoted old table if present
DROP TABLE IF EXISTS users CASCADE;    -- drop users if you want complete reset

-- 1) users (canonical)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  reset_token VARCHAR(100),
  reset_token_expiry TIMESTAMP WITH TIME ZONE
);

-- 2) elders (one user can have many elders)
CREATE TABLE elders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_elders_user ON elders(user_id);

-- 3) pantry_items
CREATE TABLE pantry_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit VARCHAR(32),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_pantry_user ON pantry_items(user_id);

-- 4) nutrition_entries (optionally linked to an elder)
CREATE TABLE nutrition_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  elder_id INTEGER REFERENCES elders(id) ON DELETE SET NULL,
  item_name VARCHAR(150) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  calories NUMERIC(10,2),
  protein NUMERIC(10,2),
  fat NUMERIC(10,2),
  carbs NUMERIC(10,2),
  fiber NUMERIC(10,2),
  sugar NUMERIC(10,2),
  spoonacular_id INTEGER,
  source_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  date_consumed DATE DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON nutrition_entries(user_id, date_consumed);

-- 5) ingredient_cache
CREATE TABLE ingredient_cache (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) UNIQUE,
  spoonacular_id INTEGER,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6) daily_summary (per user)
CREATE TABLE daily_summary (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calories NUMERIC(12,2) DEFAULT 0,
  total_protein NUMERIC(12,2) DEFAULT 0,
  total_fat NUMERIC(12,2) DEFAULT 0,
  total_carbs NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, date)
);

-- 7) receipts & receipt_items
CREATE TABLE receipts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_name VARCHAR(255),
  bill_number VARCHAR(50),
  receipt_date DATE,
  total_amount NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts(user_id);

CREATE TABLE receipt_items (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  item_name VARCHAR(255),
  quantity NUMERIC(10,2),
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2)
);

-- 8) seed demo user (optional)
INSERT INTO users (name, email, password_hash)
VALUES ('Demo User', 'demo@smartpantry.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW')
ON CONFLICT (email) DO NOTHING;

-- Ensure serial sequences are set correctly
SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT max(id) FROM users),1), true);
SELECT setval(pg_get_serial_sequence('elders','id'), COALESCE((SELECT max(id) FROM elders),1), true);
SELECT setval(pg_get_serial_sequence('pantry_items','id'), COALESCE((SELECT max(id) FROM pantry_items),1), true);
SELECT setval(pg_get_serial_sequence('nutrition_entries','id'), COALESCE((SELECT max(id) FROM nutrition_entries),1), true);
SELECT setval(pg_get_serial_sequence('ingredient_cache','id'), COALESCE((SELECT max(id) FROM ingredient_cache),1), true);
SELECT setval(pg_get_serial_sequence('daily_summary','id'), COALESCE((SELECT max(id) FROM daily_summary),1), true);
SELECT setval(pg_get_serial_sequence('receipts','id'), COALESCE((SELECT max(id) FROM receipts),1), true);
SELECT setval(pg_get_serial_sequence('receipt_items','id'), COALESCE((SELECT max(id) FROM receipt_items),1), true);

COMMIT;
ALTER TABLE nutrition_entries
ADD COLUMN sodium NUMERIC(10,2),
ADD COLUMN cholesterol NUMERIC(10,2),
ADD COLUMN potassium NUMERIC(10,2);

CREATE TABLE medical_nutrient_rules (
    rule_id SERIAL PRIMARY KEY,
    condition VARCHAR(100) NOT NULL,
    nutrient VARCHAR(50) NOT NULL,
    max_daily_value NUMERIC(10,2),
    unit VARCHAR(20) NOT NULL,
    severity VARCHAR(10) CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
    source_basis VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(condition, nutrient)  -- Prevent duplicate rules
);
-- medical_nutrient_rules_insert.sql
-- Run this in PGAdmin Query Tool after creating the table

INSERT INTO medical_nutrient_rules (condition, nutrient, max_daily_value, unit, severity, source_basis) VALUES
('Diabetes', 'total_carbohydrate_g', 130, 'g', 'HIGH', 'ADA Guidelines'),
('Diabetes', 'added_sugar_g', 25, 'g', 'HIGH', 'ADA Guidelines'),
('Diabetes', 'saturated_fat_g', 13, 'g', 'HIGH', 'ADA Guidelines'),
('Diabetes', 'cholesterol_mg', 200, 'mg', 'MEDIUM', 'ADA Guidelines'),
('Diabetes', 'sodium_mg', 2300, 'mg', 'MEDIUM', 'ADA Guidelines'),
('Diabetes', 'potassium_mg', 4700, 'mg', 'LOW', 'ADA Guidelines'),
('Diabetes', 'fiber_g', 25, 'g', 'LOW', 'ADA Guidelines'),
('Hypertension', 'sodium_mg', 1500, 'mg', 'HIGH', 'AHA Guidelines'),
('Hypertension', 'potassium_mg', 4700, 'mg', 'LOW', 'AHA Guidelines'),
('Hypertension', 'saturated_fat_g', 13, 'g', 'MEDIUM', 'AHA Guidelines'),
('Hypertension', 'cholesterol_mg', 200, 'mg', 'MEDIUM', 'AHA Guidelines'),
('Hypertension', 'alcohol_servings', 1, 'serving', 'MEDIUM', 'AHA Guidelines'),
('Cardiac Disease', 'saturated_fat_g', 13, 'g', 'HIGH', 'AHA Guidelines'),
('Cardiac Disease', 'trans_fat_g', 2, 'g', 'HIGH', 'AHA Guidelines'),
('Cardiac Disease', 'cholesterol_mg', 200, 'mg', 'HIGH', 'AHA Guidelines'),
('Cardiac Disease', 'sodium_mg', 1500, 'mg', 'HIGH', 'AHA Guidelines'),
('Cardiac Disease', 'potassium_mg', 4700, 'mg', 'LOW', 'AHA Guidelines'),
('Cardiac Disease', 'fiber_g', 30, 'g', 'LOW', 'AHA Guidelines'),
('Cardiac Disease', 'omega3_g', 1, 'g', 'LOW', 'AHA Guidelines'),
('Kidney Disease', 'protein_g', 0.8, 'g_per_kg', 'HIGH', 'NKF Guidelines'),
('Kidney Disease', 'potassium_mg', 2000, 'mg', 'HIGH', 'NKF Guidelines'),
('Kidney Disease', 'phosphorus_mg', 1000, 'mg', 'HIGH', 'NKF Guidelines'),
('Kidney Disease', 'sodium_mg', 2000, 'mg', 'HIGH', 'NKF Guidelines'),
('Kidney Disease', 'calcium_mg', 2000, 'mg', 'MEDIUM', 'NKF Guidelines'),
('Kidney Disease', 'fluid_ml', 2000, 'ml', 'MEDIUM', 'NKF Guidelines'),
('Osteoporosis', 'sodium_mg', 2300, 'mg', 'HIGH', 'NOF Guidelines'),
('Osteoporosis', 'caffeine_mg', 300, 'mg', 'HIGH', 'NOF Guidelines'),
('Osteoporosis', 'protein_g', 46, 'g', 'LOW', 'NOF Guidelines'),
('Osteoporosis', 'calcium_mg', 1200, 'mg', 'LOW', 'NOF Guidelines'),
('Osteoporosis', 'vitamin_d_iu', 800, 'iu', 'LOW', 'NOF Guidelines'),
('Gout', 'purines_mg', 400, 'mg', 'HIGH', 'ACR Guidelines'),
('Gout', 'alcohol_servings', 1, 'serving', 'HIGH', 'ACR Guidelines'),
('Gout', 'fructose_g', 25, 'g', 'HIGH', 'ACR Guidelines'),
('Gout', 'protein_g', 113, 'g', 'MEDIUM', 'ACR Guidelines'),
('GERD', 'caffeine_mg', 200, 'mg', 'HIGH', 'AGA Guidelines'),
('GERD', 'fat_g', 30, 'g', 'HIGH', 'AGA Guidelines'),
('GERD', 'chocolate_g', 30, 'g', 'MEDIUM', 'AGA Guidelines'),
('GERD', 'peppermint_g', 5, 'g', 'MEDIUM', 'AGA Guidelines'),
('GERD', 'spicy_foods', NULL, 'level', 'MEDIUM', 'AGA Guidelines'),
('Celiac Disease', 'gluten_mg', 20, 'mg', 'HIGH', 'ACG Guidelines'),
('Lactose Intolerance', 'lactose_g', 12, 'g', 'HIGH', 'NIH Guidelines'),
('IBS', 'fiber_g', 20, 'g', 'MEDIUM', 'ACG Guidelines'),
('IBS', 'fodmaps', NULL, 'level', 'HIGH', 'MONASH University'),
('IBS', 'fat_g', 40, 'g', 'MEDIUM', 'ACG Guidelines'),
('IBS', 'caffeine_mg', 200, 'mg', 'MEDIUM', 'ACG Guidelines'),
('Hyperthyroidism', 'iodine_mcg', 150, 'mcg', 'HIGH', 'ATA Guidelines'),
('Hyperthyroidism', 'caffeine_mg', 200, 'mg', 'MEDIUM', 'ATA Guidelines'),
('Hyperthyroidism', 'sugar_g', 25, 'g', 'MEDIUM', 'ATA Guidelines'),
('Diverticulosis', 'fiber_g', 25, 'g', 'LOW', 'ACG Guidelines'),
('Diverticulosis', 'seeds_nuts', NULL, 'level', 'HIGH', 'ACG Guidelines'),
('Anemia', 'iron_mg', 45, 'mg', 'HIGH', 'NIH Guidelines'),
('Anemia', 'calcium_mg', 1200, 'mg', 'MEDIUM', 'NIH Guidelines'),
('Anemia', 'vitamin_c_mg', 90, 'mg', 'LOW', 'NIH Guidelines'),
('Anemia', 'tea_coffee', NULL, 'level', 'MEDIUM', 'NIH Guidelines'),
('Cirrhosis', 'protein_g', 1.2, 'g_per_kg', 'LOW', 'AASLD Guidelines'),
('Cirrhosis', 'sodium_mg', 2000, 'mg', 'HIGH', 'AASLD Guidelines'),
('Cirrhosis', 'fluid_ml', 1500, 'ml', 'MEDIUM', 'AASLD Guidelines'),
('Cirrhosis', 'alcohol_g', 0, 'g', 'HIGH', 'AASLD Guidelines'),
('Migraine', 'tyramine_mg', 6, 'mg', 'HIGH', 'ACNP Guidelines'),
('Migraine', 'msg_mg', 500, 'mg', 'HIGH', 'ACNP Guidelines'),
('Migraine', 'caffeine_mg', 200, 'mg', 'MEDIUM', 'ACNP Guidelines'),
('Migraine', 'chocolate_g', 30, 'g', 'MEDIUM', 'ACNP Guidelines'),
('PCOS', 'saturated_fat_g', 20, 'g', 'HIGH', 'ESHRE Guidelines'),
('PCOS', 'added_sugar_g', 25, 'g', 'HIGH', 'ESHRE Guidelines'),
('PCOS', 'fiber_g', 25, 'g', 'LOW', 'ESHRE Guidelines'),
('PCOS', 'omega3_g', 1.1, 'g', 'LOW', 'ESHRE Guidelines'),
('Hypothyroidism', 'soy_g', 30, 'g', 'MEDIUM', 'ATA Guidelines'),
('Hypothyroidism', 'iron_mg', 45, 'mg', 'MEDIUM', 'ATA Guidelines'),
('Hypothyroidism', 'fiber_g', 25, 'g', 'MEDIUM', 'ATA Guidelines'),
('COPD', 'protein_g', 1.2, 'g_per_kg', 'LOW', 'ATS Guidelines'),
('COPD', 'carbohydrate_g', 130, 'g', 'MEDIUM', 'ATS Guidelines'),
('COPD', 'potassium_mg', 4700, 'mg', 'LOW', 'ATS Guidelines'),
('COPD', 'magnesium_mg', 420, 'mg', 'LOW', 'ATS Guidelines'),
('HIV', 'protein_g', 1.5, 'g_per_kg', 'LOW', 'DHHS Guidelines'),
('HIV', 'fat_g', 30, 'g', 'MEDIUM', 'DHHS Guidelines'),
('HIV', 'zinc_mg', 40, 'mg', 'HIGH', 'DHHS Guidelines'),
('HIV', 'iron_mg', 45, 'mg', 'MEDIUM', 'DHHS Guidelines'),
('Epilepsy', 'ketogenic_ratio', NULL, 'ratio', 'HIGH', 'ILAE Guidelines'),
('Epilepsy', 'carbohydrate_g', 20, 'g', 'HIGH', 'ILAE Guidelines'),
('Epilepsy', 'protein_g', 1, 'g_per_kg', 'MEDIUM', 'ILAE Guidelines'),
('Epilepsy', 'fluid_ml', 2000, 'ml', 'MEDIUM', 'ILAE Guidelines'),
('Crohns Disease', 'fiber_g', 10, 'g', 'MEDIUM', 'ACG Guidelines'),
('Crohns Disease', 'lactose_g', 12, 'g', 'MEDIUM', 'ACG Guidelines'),
('Crohns Disease', 'fat_g', 50, 'g', 'MEDIUM', 'ACG Guidelines'),
('Crohns Disease', 'iron_mg', 18, 'mg', 'LOW', 'ACG Guidelines'),
('Ulcerative Colitis', 'fiber_g', 25, 'g', 'MEDIUM', 'ACG Guidelines'),
('Ulcerative Colitis', 'lactose_g', 12, 'g', 'MEDIUM', 'ACG Guidelines'),
('Ulcerative Colitis', 'omega3_g', 2.7, 'g', 'LOW', 'ACG Guidelines'),
('Ulcerative Colitis', 'iron_mg', 18, 'mg', 'LOW', 'ACG Guidelines'),
('Gallstones', 'fat_g', 30, 'g', 'HIGH', 'ACG Guidelines'),
('Gallstones', 'cholesterol_mg', 200, 'mg', 'HIGH', 'ACG Guidelines'),
('Gallstones', 'fiber_g', 30, 'g', 'LOW', 'ACG Guidelines'),
('Gallstones', 'calcium_mg', 1000, 'mg', 'LOW', 'ACG Guidelines'),
('Pancreatitis', 'fat_g', 30, 'g', 'HIGH', 'ACG Guidelines'),
('Pancreatitis', 'alcohol_g', 0, 'g', 'HIGH', 'ACG Guidelines'),
('Pancreatitis', 'protein_g', 1.5, 'g_per_kg', 'LOW', 'ACG Guidelines'),
('Pancreatitis', 'antioxidants', NULL, 'level', 'LOW', 'ACG Guidelines')
ON CONFLICT (condition, nutrient) DO NOTHING;

CREATE TABLE medicine_food_interactions (
    interaction_id SERIAL PRIMARY KEY,
    medicine VARCHAR(100) NOT NULL,
    affected_item VARCHAR(100) NOT NULL,
    interaction_type VARCHAR(20) CHECK (interaction_type IN ('nutrient', 'food', 'herb', 'beverage')),
    severity VARCHAR(10) CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
    effect_description TEXT,
    food_nutrient_category VARCHAR(100),
    recommendation TEXT,
    time_guidance VARCHAR(100),
    source VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(medicine, affected_item)
);
CREATE TABLE medicine_food_interactions (
    interaction_id SERIAL PRIMARY KEY,
    medicine VARCHAR(100) NOT NULL,
    affected_item VARCHAR(100) NOT NULL,
    interaction_type VARCHAR(20) CHECK (interaction_type IN ('nutrient', 'food', 'herb', 'beverage')),
    severity VARCHAR(10) CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
    effect_description TEXT,
    food_nutrient_category VARCHAR(100),
    recommendation TEXT,
    time_guidance VARCHAR(100),
    source VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(medicine, affected_item)
);

INSERT INTO medicine_food_interactions 
(medicine, affected_item, interaction_type, severity, effect_description, food_nutrient_category) VALUES
('Warfarin', 'vitamin_k_mg', 'nutrient', 'HIGH', 'Reduces anticoagulant effect', 'Green Leafy Vegetables'),
('Metformin', 'sugar_g', 'nutrient', 'MEDIUM', 'Can cause GI distress if taken with high sugar', 'All Sugars'),
('Statins', 'grapefruit', 'food', 'HIGH', 'Increases drug toxicity 10x', 'Grapefruit Products'),
('ACE Inhibitors', 'potassium_mg', 'nutrient', 'HIGH', 'Risk of hyperkalemia', 'High Potassium Foods'),
('MAO Inhibitors', 'tyramine_mg', 'nutrient', 'HIGH', 'Can cause hypertensive crisis', 'Aged/Cured Foods'),
('Antibiotics (Tetracycline)', 'calcium_mg', 'nutrient', 'HIGH', 'Reduces drug absorption', 'Dairy Products'),
('Thyroid Medication (Levothyroxine)', 'calcium_mg', 'nutrient', 'HIGH', 'Reduces drug absorption by 30%', 'Dairy/Soy'),
('Thyroid Medication (Levothyroxine)', 'soy_g', 'nutrient', 'HIGH', 'Interferes with absorption', 'Soy Products'),
('Thyroid Medication (Levothyroxine)', 'fiber_g', 'nutrient', 'MEDIUM', 'Reduces absorption by 50%', 'High Fiber Foods'),
('Lithium', 'sodium_mg', 'nutrient', 'HIGH', 'Low sodium increases lithium toxicity', 'Salt/Sodium'),
('Diuretics (Furosemide)', 'potassium_mg', 'nutrient', 'HIGH', 'Can cause hypokalemia', 'All Foods'),
('Potassium-Sparing Diuretics', 'potassium_mg', 'nutrient', 'HIGH', 'Risk of hyperkalemia', 'High Potassium Foods'),
('Digoxin', 'fiber_g', 'nutrient', 'MEDIUM', 'Reduces drug absorption', 'High Fiber Foods'),
('Digoxin', 'licorice', 'food', 'HIGH', 'Can cause hypokalemia & toxicity', 'Licorice Root'),
('Blood Thinners (Anticoagulants)', 'vitamin_k_mg', 'nutrient', 'HIGH', 'Reduces effectiveness', 'Vitamin K Foods'),
('Blood Thinners (Anticoagulants)', 'alcohol_ml', 'nutrient', 'MEDIUM', 'Increases bleeding risk', 'Alcohol'),
('NSAIDs (Ibuprofen)', 'alcohol_ml', 'nutrient', 'HIGH', 'Increases stomach bleeding risk', 'Alcohol'),
('Acetaminophen', 'alcohol_ml', 'nutrient', 'HIGH', 'Increases liver damage risk', 'Alcohol'),
('Antidepressants (SSRIs)', 'tyramine_mg', 'nutrient', 'MEDIUM', 'Serotonin syndrome risk', 'Aged Foods'),
('Antidepressants (SSRIs)', 'grapefruit', 'food', 'MEDIUM', 'Increases side effects', 'Grapefruit Products'),
('Benzodiazepines', 'grapefruit', 'food', 'HIGH', 'Increases sedation effect', 'Grapefruit Products'),
('Benzodiazepines', 'alcohol_ml', 'nutrient', 'HIGH', 'Dangerous sedation combination', 'Alcohol'),
('Calcium Channel Blockers', 'grapefruit', 'food', 'HIGH', 'Increases drug toxicity', 'Grapefruit Products'),
('Quinolone Antibiotics', 'calcium_mg', 'nutrient', 'HIGH', 'Reduces absorption by 50%', 'Dairy Products'),
('Quinolone Antibiotics', 'iron_mg', 'nutrient', 'HIGH', 'Reduces absorption', 'Minerals'),
('Iron Supplements', 'calcium_mg', 'nutrient', 'HIGH', 'Reduces iron absorption', 'Dairy Products'),
('Iron Supplements', 'tea_coffee', 'nutrient', 'MEDIUM', 'Reduces absorption by 60%', 'Tea/Coffee'),
('Iron Supplements', 'fiber_g', 'nutrient', 'MEDIUM', 'Reduces absorption', 'High Fiber Foods'),
('Corticosteroids', 'sodium_mg', 'nutrient', 'HIGH', 'Increases fluid retention', 'Salt/Sodium'),
('Corticosteroids', 'potassium_mg', 'nutrient', 'MEDIUM', 'Increases potassium loss', 'Fruits/Veggies'),
('Corticosteroids', 'sugar_g', 'nutrient', 'MEDIUM', 'Worsens hyperglycemia', 'Sugary Foods'),
('Beta Blockers', 'potassium_mg', 'nutrient', 'HIGH', 'Risk of hyperkalemia', 'High Potassium Foods'),
('Beta Blockers', 'licorice', 'food', 'MEDIUM', 'Can cause hypertension', 'Licorice Root'),
('Antacids', 'calcium_mg', 'nutrient', 'MEDIUM', 'Can cause milk-alkali syndrome with excess calcium', 'Dairy'),
('Antacids', 'iron_mg', 'nutrient', 'MEDIUM', 'Reduces iron absorption', 'Minerals'),
('Proton Pump Inhibitors (PPIs)', 'magnesium_mg', 'nutrient', 'MEDIUM', 'Can cause magnesium deficiency', 'Nuts/Seeds'),
('Proton Pump Inhibitors (PPIs)', 'calcium_mg', 'nutrient', 'MEDIUM', 'Reduces calcium absorption', 'Dairy'),
('Proton Pump Inhibitors (PPIs)', 'vitamin_b12_mcg', 'nutrient', 'LOW', 'Reduces B12 absorption', 'Animal Products'),
('Methotrexate', 'folate_mcg', 'nutrient', 'MEDIUM', 'Increases side effects', 'Folate-Rich Foods'),
('Allopurinol', 'alcohol_ml', 'nutrient', 'HIGH', 'Increases uric acid levels', 'Alcohol'),
('Allopurinol', 'vitamin_c_mg', 'nutrient', 'MEDIUM', 'Increases kidney stone risk', 'Vitamin C Supplements'),
('Ciprofloxacin', 'caffeine_mg', 'nutrient', 'MEDIUM', 'Increases caffeine side effects', 'Coffee/Tea'),
('Ciprofloxacin', 'dairy', 'food', 'HIGH', 'Reduces absorption by 50%', 'Dairy Products'),
('Metronidazole', 'alcohol_ml', 'nutrient', 'HIGH', 'Disulfiram-like reaction', 'Alcohol'),
('Disulfiram', 'alcohol_ml', 'nutrient', 'HIGH', 'Severe reaction even with small amounts', 'Alcohol'),
('Tetracycline', 'iron_mg', 'nutrient', 'HIGH', 'Reduces absorption by 50%', 'Iron-Rich Foods'),
('Tetracycline', 'zinc_mg', 'nutrient', 'MEDIUM', 'Reduces absorption', 'Zinc-Rich Foods'),
('Aspirin', 'alcohol_ml', 'nutrient', 'HIGH', 'Increases stomach bleeding', 'Alcohol'),
('Aspirin', 'vitamin_k_mg', 'nutrient', 'MEDIUM', 'Reduces antiplatelet effect', 'Green Veggies'),
('Valproic Acid', 'alcohol_ml', 'nutrient', 'HIGH', 'Increases sedation', 'Alcohol'),
('Carbamazepine', 'grapefruit', 'food', 'HIGH', 'Increases drug levels', 'Grapefruit Products'),
('Carbamazepine', 'alcohol_ml', 'nutrient', 'HIGH', 'Increases sedation', 'Alcohol'),
('Isotretinoin', 'vitamin_a_mg', 'nutrient', 'HIGH', 'Risk of vitamin A toxicity', 'Liver/Supplements'),
('Isotretinoin', 'alcohol_ml', 'nutrient', 'HIGH', 'Increases liver damage risk', 'Alcohol'),
('Cholesterol Drugs (Fibrates)', 'grapefruit', 'food', 'MEDIUM', 'Increases side effects', 'Grapefruit Products'),
('HIV Medications (Protease Inhibitors)', 'grapefruit', 'food', 'HIGH', 'Increases drug toxicity', 'Grapefruit Products'),
('Immunosuppressants (Cyclosporine)', 'grapefruit', 'food', 'HIGH', 'Increases drug toxicity 5x', 'Grapefruit Products'),
('Parkinson''s Drugs (Levodopa)', 'protein_g', 'nutrient', 'HIGH', 'Reduces drug effectiveness', 'High Protein Foods'),
('Parkinson''s Drugs (Levodopa)', 'iron_mg', 'nutrient', 'MEDIUM', 'Reduces absorption', 'Iron-Rich Foods'),
('Blood Pressure Meds (Clonidine)', 'alcohol_ml', 'nutrient', 'HIGH', 'Severe blood pressure drop', 'Alcohol'),
('Diabetes Medications (Sulfonylureas)', 'alcohol_ml', 'nutrient', 'HIGH', 'Dangerous low blood sugar', 'Alcohol'),
('Diabetes Medications (Sulfonylureas)', 'licorice', 'food', 'MEDIUM', 'Worsens low blood sugar', 'Licorice Root'),
('Diabetes Medications (Meglitinides)', 'sugar_g', 'nutrient', 'HIGH', 'Causes blood sugar spikes', 'Sugary Foods'),
('Bronchodilators (Theophylline)', 'caffeine_mg', 'nutrient', 'HIGH', 'Increases caffeine toxicity', 'Coffee/Tea/Chocolate'),
('Bronchodilators (Theophylline)', 'charcoal_broiled_food', 'food', 'MEDIUM', 'Reduces drug effectiveness', 'Barbecued Foods'),
('Tranquilizers (Phenothiazines)', 'alcohol_ml', 'nutrient', 'HIGH', 'Severe sedation', 'Alcohol'),
('Tranquilizers (Phenothiazines)', 'caffeine_mg', 'nutrient', 'MEDIUM', 'Reduces drug effectiveness', 'Caffeine'),
('Blood Pressure Meds (Alpha Blockers)', 'alcohol_ml', 'nutrient', 'HIGH', 'Dangerous blood pressure drop', 'Alcohol'),
('Antipsychotics', 'grapefruit', 'food', 'MEDIUM', 'Increases side effects', 'Grapefruit Products'),
('Antipsychotics', 'alcohol_ml', 'nutrient', 'HIGH', 'Increased sedation', 'Alcohol'),
('Anti-Anxiety (Buspirone)', 'grapefruit', 'food', 'HIGH', 'Increases drug toxicity', 'Grapefruit Products'),
('Anti-Anxiety (Buspirone)', 'alcohol_ml', 'nutrient', 'HIGH', 'Increased sedation', 'Alcohol'),
('Muscle Relaxants', 'alcohol_ml', 'nutrient', 'HIGH', 'Dangerous sedation', 'Alcohol'),
('Sleep Aids', 'alcohol_ml', 'nutrient', 'HIGH', 'Life-threatening sedation', 'Alcohol'),
('ADHD Medications (Stimulants)', 'caffeine_mg', 'nutrient', 'HIGH', 'Increased heart rate/blood pressure', 'Caffeine'),
('ADHD Medications (Stimulants)', 'citrus_juice', 'nutrient', 'MEDIUM', 'Reduces absorption', 'Citrus Juices'),
('Osteoporosis Drugs (Bisphosphonates)', 'calcium_mg', 'nutrient', 'HIGH', 'Reduces absorption by 60%', 'Calcium Sources'),
('Osteoporosis Drugs (Bisphosphonates)', 'iron_mg', 'nutrient', 'HIGH', 'Reduces absorption by 50%', 'Iron Sources'),
('Antifungals (Ketoconazole)', 'grapefruit', 'food', 'HIGH', 'Increases drug toxicity', 'Grapefruit Products'),
('Antifungals (Ketoconazole)', 'antacids', 'food', 'HIGH', 'Reduces absorption', 'Antacids'),
('Gout Medication (Probenecid)', 'alcohol_ml', 'nutrient', 'MEDIUM', 'Reduces effectiveness', 'Alcohol'),
('Gout Medication (Probenecid)', 'vitamin_c_mg', 'nutrient', 'MEDIUM', 'Increases kidney stone risk', 'Vitamin C'),
('Heart Medication (Nitrates)', 'alcohol_ml', 'nutrient', 'HIGH', 'Dangerous blood pressure drop', 'Alcohol'),
('Heart Medication (Nitrates)', 'viagra', 'food', 'HIGH', 'Life-threatening combination', 'Medication Interaction'),
('Erectile Dysfunction Drugs (PDE5)', 'grapefruit', 'food', 'HIGH', 'Increases side effects', 'Grapefruit Products'),
('Erectile Dysfunction Drugs (PDE5)', 'alcohol_ml', 'nutrient', 'MEDIUM', 'Can cause low blood pressure', 'Alcohol'),
('Chemotherapy Drugs', 'grapefruit', 'food', 'HIGH', 'Alters drug metabolism', 'Grapefruit Products'),
('Chemotherapy Drugs', 'st_johns_wort', 'herb', 'HIGH', 'Reduces effectiveness', 'Herbal Supplements'),
('Blood Thinners (Antiplatelets)', 'ginger_g', 'nutrient', 'MEDIUM', 'Increases bleeding risk', 'Ginger'),
('Blood Thinners (Antiplatelets)', 'garlic_g', 'nutrient', 'MEDIUM', 'Increases bleeding risk', 'Garlic'),
('Blood Thinners (Antiplatelets)', 'ginkgo_biloba', 'herb', 'MEDIUM', 'Increases bleeding risk', 'Herbal Supplements'),
('Birth Control Pills', 'st_johns_wort', 'herb', 'HIGH', 'Reduces effectiveness', 'Herbal Supplements'),
('Birth Control Pills', 'grapefruit', 'food', 'MEDIUM', 'Increases hormone levels', 'Grapefruit Products'),
('Blood Pressure Meds (Beta Blockers)', 'bananas', 'food', 'MEDIUM', 'Potassium interactions', 'Bananas'),
('Blood Pressure Meds (Beta Blockers)', 'licorice', 'food', 'MEDIUM', 'Increases blood pressure', 'Licorice'),
('Antihistamines', 'grapefruit', 'food', 'MEDIUM', 'Increases drowsiness', 'Grapefruit Products'),
('Antihistamines', 'alcohol_ml', 'nutrient', 'HIGH', 'Severe drowsiness', 'Alcohol'),
('Decongestants', 'caffeine_mg', 'nutrient', 'HIGH', 'Increased heart rate', 'Caffeine'),
('Decongestants', 'maoi_tyramine', 'nutrient', 'HIGH', 'Hypertensive crisis with MAOIs', 'Aged Foods')
ON CONFLICT (medicine, affected_item) DO NOTHING;


CREATE TABLE elder_food_intake (
  id SERIAL PRIMARY KEY,
  elder_id INTEGER REFERENCES elders(id) ON DELETE CASCADE,

  food_name VARCHAR(150),

  calories FLOAT,
  sugar_g FLOAT,
  sodium_mg FLOAT,
  fat_g FLOAT,
  protein_g FLOAT,
  fiber_g FLOAT,
  potassium_mg FLOAT,
  vitamin_k_mcg FLOAT,

  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE elders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_elders_user ON elders(user_id);
