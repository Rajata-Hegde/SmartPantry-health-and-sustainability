-- Create nutrition_entries table
CREATE TABLE IF NOT EXISTS nutrition_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
  food_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  calories NUMERIC(10,2),
  protein NUMERIC(10,2),
  fat NUMERIC(10,2),
  carbs NUMERIC(10,2),
  spoonacular_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_consumed DATE DEFAULT CURRENT_DATE
);

-- Index for faster queries by user and date
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON nutrition_entries(user_id, date_consumed);
