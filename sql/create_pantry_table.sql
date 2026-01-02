-- Run this in pgAdmin (database: smartpantry)
CREATE TABLE IF NOT EXISTS pantry_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  item_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit VARCHAR(32),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- optional FK to users if you want to link
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='"User"' OR table_name='user') THEN
    BEGIN
      ALTER TABLE pantry_items DROP CONSTRAINT IF EXISTS fk_pantry_user;
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'pantry_items' AND kcu.column_name = 'user_id') THEN
      ALTER TABLE pantry_items ADD CONSTRAINT fk_pantry_user FOREIGN KEY (user_id) REFERENCES "User"(user_id);
    END IF;
  END IF;
END$$;
