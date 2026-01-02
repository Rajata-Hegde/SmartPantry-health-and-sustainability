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

CREATE TABLE IF NOT EXISTS "User" (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    reset_token VARCHAR(100),
    reset_token_expiry TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Elder" (
    elder_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    age INTEGER,
    medical_conditions TEXT,
    dietary_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_elder_user
        FOREIGN KEY (user_id)
        REFERENCES "User"(user_id)
        ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS pantry_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,2) DEFAULT 1,
    unit VARCHAR(32),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_pantry_user
        FOREIGN KEY (user_id)
        REFERENCES "User"(user_id)
        ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ingredient_cache (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    spoonacular_id INTEGER,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS nutrition_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    calories NUMERIC(10,2),
    protein NUMERIC(10,2),
    fat NUMERIC(10,2),
    carbs NUMERIC(10,2),
    fiber NUMERIC(10,2),
    sugar NUMERIC(10,2),
    spoonacular_id INTEGER,
    source_json JSONB,
    date_consumed DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_nutrition_user
        FOREIGN KEY (user_id)
        REFERENCES "User"(user_id)
        ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date
ON nutrition_entries(user_id, date_consumed);
CREATE TABLE IF NOT EXISTS daily_summary (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    total_calories NUMERIC(10,2) DEFAULT 0,
    total_protein NUMERIC(10,2) DEFAULT 0,
    total_fat NUMERIC(10,2) DEFAULT 0,
    total_carbs NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_date UNIQUE (user_id, date),
    CONSTRAINT fk_summary_user
        FOREIGN KEY (user_id)
        REFERENCES "User"(user_id)
        ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    store_name VARCHAR(255),
    bill_number VARCHAR(50),
    receipt_date DATE,
    total_amount NUMERIC(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_receipts_user
        FOREIGN KEY (user_id)
        REFERENCES "User"(user_id)
        ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL,
    item_name VARCHAR(255),
    quantity NUMERIC(10,2),
    unit_price NUMERIC(10,2),
    total_price NUMERIC(10,2),
    CONSTRAINT fk_receipt_items_receipt
        FOREIGN KEY (receipt_id)
        REFERENCES receipts(id)
        ON DELETE CASCADE
);
DROP TABLE IF EXISTS "Elder";

CREATE TABLE elders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    notes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_elders_user
        FOREIGN KEY (user_id)
        REFERENCES "User"(user_id)
        ON DELETE CASCADE
);

