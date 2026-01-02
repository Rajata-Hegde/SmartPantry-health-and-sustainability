# Healthcare UI (demo)

This is a minimal Vite + React app demonstrating a polished login flow and dashboard layout for a healthcare-grade UI.

Quick start:

```bash
cd d:/project1
npm install
npm run dev
```

Notes:
- Authentication is mocked and stored in `localStorage` for demo purposes.
- You provided this table for PostgreSQL; this scaffold does not connect to the DB yet:

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

Next steps I can take: install dependencies, run the dev server, or integrate a real backend.
