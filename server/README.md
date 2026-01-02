# Server (auth)

This small Express server provides authentication endpoints connected to your Postgres DB.

Setup:

- Copy `.env.example` to `.env` and fill values (PG credentials + `JWT_SECRET`).
- From `server` folder run `npm install` then `npm run dev`.

Endpoints:
- `POST /api/register` {name,email,password}
- `POST /api/login` {email,password}
- `POST /api/forgot-password` {email}
- `POST /api/reset-password` {token,password}

Notes:
- `forgot-password` prints a reset link to the server console. Integrate real email sending in production.
- The server will create the `User` table if it does not exist, using the schema you provided.
